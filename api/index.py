import os
import json
import re
import urllib.parse
import mimetypes
from http.server import BaseHTTPRequestHandler

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    pass

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TIME_SLOTS = [
    {"slot": 1, "time": "8.00am–9.00am", "start": "08:00", "end": "09:00"},
    {"slot": 2, "time": "9.00am–10.00am", "start": "09:00", "end": "10:00"},
    {"slot": 3, "time": "10.00am–11.00am", "start": "10:00", "end": "11:00"},
    {"slot": 4, "time": "11.00am–12.00pm", "start": "11:00", "end": "12:00"},
    {"slot": 5, "time": "12.00pm–1.00pm", "start": "12:00", "end": "13:00"},
    {"slot": 6, "time": "1.00pm–2.00pm", "start": "13:00", "end": "14:00"},
    {"slot": 7, "time": "2.00pm–3.00pm", "start": "14:00", "end": "15:00"},
    {"slot": 8, "time": "3.00pm–4.00pm", "start": "15:00", "end": "16:00"},
    {"slot": 9, "time": "4.00pm–5.00pm", "start": "16:00", "end": "17:00"},
    {"slot": 10, "time": "5.00pm–6.00pm", "start": "17:00", "end": "18:00"},
    {"slot": 11, "time": "6.00pm–7.00pm", "start": "18:00", "end": "19:00"},
    {"slot": 12, "time": "7.00pm–8.00pm", "start": "19:00", "end": "20:00"},
    {"slot": 13, "time": "8.00pm–9.00pm", "start": "20:00", "end": "21:00"},
]

COLOR_PALETTE = [
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
    "#ec4899", "#06b6d4", "#f97316", "#6366f1"
]

def parse_week_string(week_str):
    if not week_str:
        return list(range(1, 15))
    normalized = re.sub(r'[—–~～至to\s]+', '-', str(week_str))
    clean = re.sub(r'[^\d,\-]', '', normalized)
    weeks = set()
    parts = clean.split(',')
    for part in parts:
        part = part.strip()
        if not part:
            continue
        range_match = part.split('-')
        if len(range_match) == 2 and range_match[0].isdigit() and range_match[1].isdigit():
            start, end = int(range_match[0]), int(range_match[1])
            for w in range(start, end + 1):
                weeks.add(w)
        elif part.isdigit():
            weeks.add(int(part))
    result = sorted(list(weeks))
    return result if result else list(range(1, 15))

def parse_timetable_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    
    student_name = ""
    welcome_match = re.search(r'Welcome,\s*([^<>\n\r]+)', html_content, re.IGNORECASE)
    if welcome_match:
        student_name = welcome_match.group(1).strip()
    
    tables = soup.find_all('table')
    target_table = None
    for tbl in tables:
        txt = tbl.get_text()
        if 'Monday' in txt and ('Tuesday' in txt or 'Wednesday' in txt):
            target_table = tbl
            break
            
    if not target_table and tables:
        target_table = tables[0]

    if not target_table:
        return {"studentName": student_name, "courses": []}

    rows = target_table.find_all('tr')
    if not rows:
        return {"studentName": student_name, "courses": []}

    header_row = rows[0]
    headers = [th.get_text().strip() for th in header_row.find_all(['th', 'td'])]
    day_indices = {}
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for idx, h in enumerate(headers):
        for day_num, day_name in enumerate(day_names, start=1):
            if day_name.lower() in h.lower():
                day_indices[idx] = (day_num, day_name)

    occupied = {}
    courses = []
    color_idx = 0

    for r_idx, row in enumerate(rows[1:], start=1):
        cells = row.find_all(['td', 'th'])
        c_pointer = 0
        
        for cell in cells:
            while (r_idx, c_pointer) in occupied:
                c_pointer += 1
                
            rowspan = int(cell.get('rowspan', 1))
            colspan = int(cell.get('colspan', 1))
            
            for dr in range(rowspan):
                for dc in range(colspan):
                    occupied[(r_idx + dr, c_pointer + dc)] = True
            
            day_info = day_indices.get(c_pointer)
            cell_text = cell.get_text("\n").strip()
            
            if day_info and cell_text and len(cell_text) > 3:
                day_num, day_name = day_info
                raw_lines = [l.strip() for l in cell_text.split("\n") if l.strip()]
                
                # Split cell into distinct course blocks if multiple courses share this time slot
                code_pattern = re.compile(r'^[A-Za-z]{2,5}\s*\d{3,4}[A-Za-z]?$')
                blocks = []
                current_block = []
                for line in raw_lines:
                    if code_pattern.match(line) and current_block:
                        blocks.append(current_block)
                        current_block = [line]
                    else:
                        current_block.append(line)
                if current_block:
                    blocks.append(current_block)

                start_slot_idx = r_idx - 1
                slot_info = TIME_SLOTS[start_slot_idx] if start_slot_idx < len(TIME_SLOTS) else TIME_SLOTS[0]
                end_slot_idx = min(start_slot_idx + rowspan - 1, len(TIME_SLOTS) - 1)
                end_slot_info = TIME_SLOTS[end_slot_idx]

                for b_idx, lines in enumerate(blocks):
                    code = lines[0] if len(lines) > 0 else "COURSE"
                    name = lines[1] if len(lines) > 1 else code
                    instructor = lines[2] if len(lines) > 2 else "Lecturer"
                    location = lines[3] if len(lines) > 3 else "TBA"
                    weeks_str = "(Week 1–14)"
                    
                    for l in lines:
                        if "week" in l.lower() or "wk" in l.lower() or "周" in l:
                            weeks_str = l
                            break
                    
                    course_obj = {
                        "id": f"{code}-{day_num}-{r_idx}-{b_idx}",
                        "code": code,
                        "name": name,
                        "instructor": instructor,
                        "location": location,
                        "dayOfWeek": day_num,
                        "dayName": day_name,
                        "startTime": slot_info["start"],
                        "endTime": end_slot_info["end"],
                        "startSlot": r_idx,
                        "slotSpan": rowspan,
                        "weeks": parse_week_string(weeks_str),
                        "weeksText": weeks_str,
                        "colorTag": COLOR_PALETTE[color_idx % len(COLOR_PALETTE)]
                    }
                    courses.append(course_obj)
                    color_idx += 1
                
            c_pointer += colspan

    return {
        "studentName": student_name,
        "courses": courses
    }

def fetch_from_xmum_ac(username, password, semester="2026/09"):
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://ac.xmu.edu.my/",
        "Origin": "https://ac.xmu.edu.my"
    })
    
    login_url = "https://ac.xmu.edu.my/index.php?c=Login&a=login"
    payload = {
        "username": username,
        "password": password,
        "user_lb": "Student"
    }
    
    try:
        resp = s.post(login_url, data=payload, timeout=12)
        if "Login or password error" in resp.text or "error" in resp.url.lower():
            return {"success": False, "error": "学号或密码错误，请检查后再试 (Invalid credentials)"}
            
        timetable_url = "https://ac.xmu.edu.my/student/index.php?c=Default&a=Kb"
        t_resp = s.get(timetable_url, timeout=12)
        if t_resp.status_code != 200 or "拒绝访问" in t_resp.text:
            return {"success": False, "error": "登录认证未通过或无法访问课表页面"}
            
        parsed = parse_timetable_html(t_resp.text)
        return {
            "success": True,
            "studentName": parsed.get("studentName") or username,
            "courses": parsed.get("courses", []),
            "semester": semester
        }
    except Exception as e:
        return {"success": False, "error": f"连接教务系统异常: {str(e)}"}

def fetch_from_xmum_moodle(username, password):
    try:
        s = requests.Session()
        s.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://l.xmu.edu.my/login/index.php",
            "Origin": "https://l.xmu.edu.my"
        })
        
        # 1. Fetch login page to get MoodleSession & logintoken
        login_url = "https://l.xmu.edu.my/login/index.php"
        try:
            r_init = s.get(login_url, timeout=12)
        except Exception as e:
            return {"success": False, "error": f"无法连接 Moodle 服务器: {str(e)}"}
            
        soup_init = BeautifulSoup(r_init.text, "html.parser")
        token_input = soup_init.find("input", {"name": "logintoken"})
        logintoken = token_input.get("value") if token_input else ""
        
        payload = {
            "logintoken": logintoken,
            "username": username,
            "password": password
        }
        
        try:
            r_login = s.post(login_url, data=payload, timeout=15)
        except Exception as e:
            return {"success": False, "error": f"Moodle 登录请求超时或失败: {str(e)}"}
            
        if "Invalid login" in r_login.text or "loginerrormessage" in r_login.text:
            return {"success": False, "error": "Moodle 学号或密码错误，请检查后再试 (Invalid Moodle credentials)"}
            
        # Extract student name if present
        student_name = ""
        soup_dash = BeautifulSoup(r_login.text, "html.parser")
        user_elem = soup_dash.find(class_=re.compile(r"userbutton|usertext|fullname|username", re.I))
        if user_elem:
            student_name = user_elem.get_text().strip()
            
        # Extract sesskey
        sesskey = None
        sess_m = re.findall(r'M\.cfg\s*=\s*({[^;]+});', r_login.text)
        if sess_m:
            try:
                cfg = json.loads(sess_m[0])
                sesskey = cfg.get("sesskey")
            except Exception:
                pass
        if not sesskey:
            sess_input = soup_dash.find("input", {"name": "sesskey"})
            if sess_input:
                sesskey = sess_input.get("value")
                
        deadlines = []
        
        # 2. Method A: Try Moodle AJAX Service (Timeline & Action events)
        if sesskey:
            try:
                import time
                from datetime import datetime, timezone, timedelta
                now_ts = int(time.time())
                tz_my = timezone(timedelta(hours=8)) # Malaysia UTC+8
                
                ajax_url = f"https://l.xmu.edu.my/lib/ajax/service.php?sesskey={sesskey}&info=core_calendar_get_action_events_by_timesort"
                ajax_payload = [
                    {
                        "index": 0,
                        "methodname": "core_calendar_get_action_events_by_timesort",
                        "args": {
                            "limitnum": 35,
                            "timesortfrom": now_ts - 86400 * 2
                        }
                    }
                ]
                r_ajax = s.post(ajax_url, json=ajax_payload, timeout=12)
                if r_ajax.status_code == 200:
                    ajax_res = r_ajax.json()
                    if isinstance(ajax_res, list) and len(ajax_res) > 0 and not ajax_res[0].get("error"):
                        events = ajax_res[0].get("data", {}).get("events", [])
                        for ev in events:
                            timesort = ev.get("timesort", 0)
                            if timesort:
                                event_dt = datetime.fromtimestamp(timesort, tz_my)
                                due_date = event_dt.strftime("%Y-%m-%d")
                                due_time = event_dt.strftime("%H:%M")
                                days_remaining = (event_dt.date() - datetime.now(tz_my).date()).days
                            else:
                                due_date = ""
                                due_time = ""
                                days_remaining = 0
                                
                            course_info = ev.get("course", {})
                            course_name = course_info.get("fullname", "") or ev.get("coursename", "")
                            code_m = re.search(r'([A-Za-z]{3}\d{3})', course_name)
                            course_code = code_m.group(1).upper() if code_m else (course_name[:6].upper() if course_name else "COURSE")
                            
                            ev_type = ev.get("modulename", "assign")
                            is_overdue = ev.get("overdue", False) or (timesort and timesort < now_ts)
                            
                            deadlines.append({
                                "id": f"moodle-{ev.get('id', len(deadlines))}",
                                "title": ev.get("name", "待提交任务"),
                                "courseCode": course_code,
                                "courseName": course_name,
                                "dueDate": due_date,
                                "dueTime": due_time,
                                "dueTimestamp": timesort,
                                "type": ev_type,
                                "url": ev.get("url") or ev.get("action", {}).get("url") or "https://l.xmu.edu.my/my/",
                                "overdue": is_overdue,
                                "daysRemaining": days_remaining,
                                "completed": False
                            })
            except Exception as e:
                print("Moodle AJAX timeline fetch error:", e)
                
        # 3. Method B: Fallback to Upcoming calendar HTML
        if not deadlines:
            try:
                cal_url = "https://l.xmu.edu.my/calendar/view.php?view=upcoming"
                r_cal = s.get(cal_url, timeout=12)
                if r_cal.status_code == 200:
                    soup_cal = BeautifulSoup(r_cal.text, "html.parser")
                    event_nodes = soup_cal.find_all(class_=re.compile(r"event|calendar-event", re.I))
                    for ev_n in event_nodes:
                        name_elem = ev_n.find(class_=re.compile(r"name|title", re.I)) or ev_n.find("h3") or ev_n.find("h4")
                        if not name_elem:
                            continue
                        ev_title = name_elem.get_text().strip()
                        if not ev_title or "calendar" in ev_title.lower() and len(ev_title) < 15:
                            continue
                            
                        course_elem = ev_n.find(class_=re.compile(r"course", re.I))
                        course_name = course_elem.get_text().strip() if course_elem else ""
                        code_m = re.search(r'([A-Za-z]{3}\d{3})', course_name or ev_title)
                        course_code = code_m.group(1).upper() if code_m else "COURSE"
                        
                        date_elem = ev_n.find(class_=re.compile(r"date|time", re.I))
                        date_text = date_elem.get_text().strip() if date_elem else ""
                        
                        link_elem = ev_n.find("a", href=re.compile(r"/mod/|/calendar/"))
                        ev_url = link_elem["href"] if link_elem and link_elem.get("href") else "https://l.xmu.edu.my/my/"
                        
                        deadlines.append({
                            "id": f"cal-{len(deadlines)+1}",
                            "title": ev_title,
                            "courseCode": course_code,
                            "courseName": course_name or course_code,
                            "dueDate": date_text,
                            "dueTime": "",
                            "type": "quiz" if "quiz" in ev_title.lower() else "assign",
                            "url": ev_url,
                            "overdue": False,
                            "daysRemaining": 3,
                            "completed": False
                        })
            except Exception as e:
                print("Moodle Calendar HTML fetch error:", e)
                
        deadlines.sort(key=lambda d: d.get("dueTimestamp", 9999999999))
        
        return {
            "success": True,
            "studentName": student_name or username,
            "deadlines": deadlines,
            "count": len(deadlines)
        }
    except Exception as e:
        return {"success": False, "error": f"Moodle 处理异常: {str(e)}"}

class handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        parsed_url = urllib.parse.urlparse(self.path)
        parsed_path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)
        action_from_query = query_params.get('action', [''])[0]
        
        data = {}
        try:
            if post_data:
                data = json.loads(post_data.decode('utf-8'))
        except Exception:
            pass

        action_from_body = data.get('action', '') or data.get('type', '')
        action = action_from_query or action_from_body
        forwarded_path = self.headers.get('x-forwarded-uri', '') or self.headers.get('x-matched-path', '') or ''

        is_full_sync = action == 'full_sync' or '/full_sync' in parsed_path or '/full_sync' in forwarded_path
        is_moodle_sync = action == 'moodle_sync' or '/moodle_sync' in parsed_path or '/moodle_sync' in forwarded_path
        is_sync = action == 'sync' or '/sync' in parsed_path or '/sync' in forwarded_path
        is_parse = action == 'parse_html' or '/parse_html' in parsed_path or '/parse_html' in forwarded_path or ('html' in data and 'username' not in data)
        is_save = action == 'save_schedule' or '/save_schedule' in parsed_path or '/save_schedule' in forwarded_path
        is_save_deadlines = action == 'save_deadlines' or '/save_deadlines' in parsed_path or '/save_deadlines' in forwarded_path

        # Fallback if action not specified
        if not (is_full_sync or is_moodle_sync or is_sync or is_parse or is_save or is_save_deadlines):
            if 'username' in data and 'password' in data:
                is_sync = True

        if is_full_sync:
            try:
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()
                semester = data.get('semester', '2026/09')
                sync_ac = data.get('sync_ac', True)
                sync_moodle = data.get('sync_moodle', True)
                if not username or not password:
                    res = {"success": False, "error": "请输入学号和密码"}
                else:
                    ac_res = None
                    moodle_res = None
                    if sync_ac:
                        ac_res = fetch_from_xmum_ac(username, password, semester)
                    if sync_moodle:
                        moodle_res = fetch_from_xmum_moodle(username, password)
                    
                    res = {
                        "success": (ac_res.get("success", False) if sync_ac else True) and (moodle_res.get("success", False) if sync_moodle else True),
                        "ac": ac_res,
                        "moodle": moodle_res
                    }
                    if not res["success"]:
                        errors = []
                        if sync_ac and ac_res and not ac_res.get("success"):
                            errors.append(f"AC课表: {ac_res.get('error', '未知错误')}")
                        if sync_moodle and moodle_res and not moodle_res.get("success"):
                            errors.append(f"Moodle作业: {moodle_res.get('error', '未知错误')}")
                        res["error"] = "；".join(errors) if errors else "部分同步失败"
            except Exception as e:
                res = {"success": False, "error": f"一键同步异常: {str(e)}"}

        elif is_moodle_sync:
            try:
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()
                if not username or not password:
                    res = {"success": False, "error": "请输入 Moodle 学号和密码"}
                else:
                    res = fetch_from_xmum_moodle(username, password)
            except Exception as e:
                res = {"success": False, "error": f"Moodle 同步异常: {str(e)}"}

        elif is_sync:
            try:
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()
                semester = data.get('semester', '2026/09')
                
                if not username or not password:
                    res = {"success": False, "error": "请输入学号和密码"}
                else:
                    res = fetch_from_xmum_ac(username, password, semester)
            except Exception as e:
                res = {"success": False, "error": f"请求解析异常: {str(e)}"}

        elif is_parse:
            try:
                html_code = data.get('html', '')
                res = parse_timetable_html(html_code)
                res["success"] = True
            except Exception as e:
                res = {"success": False, "error": f"解析失败: {str(e)}"}
        elif is_save or is_save_deadlines:
            res = {"success": True}
        else:
            res = {"success": False, "error": f"API Route Not Found (path={self.path}, fwd={forwarded_path})"}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        parsed_path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)
        action = query_params.get('action', [''])[0]
        forwarded_path = self.headers.get('x-forwarded-uri', '') or self.headers.get('x-matched-path', '') or ''
        
        # 1. API Deadlines retrieval
        if action == 'deadlines' or '/deadlines' in parsed_path or '/deadlines' in forwarded_path:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            res = {"success": True, "deadlines": []}
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        # 2. API Schedule retrieval
        if action == 'schedule' or '/schedule' in parsed_path or '/schedule' in forwarded_path:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            res = {"success": True, "schedule": {"studentName": "同学", "studentId": "", "courses": []}}
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        # 2. If user visits /api or /api/ directly in browser, redirect them to the frontend app /
        if parsed_path in ('/api', '/api/') or forwarded_path in ('/api', '/api/'):
            self.send_response(302)
            self.send_header('Location', '/')
            self.end_headers()
            return


        # 3. Serve Static Frontend Files
        rel_path = parsed_path.lstrip('/')
        if not rel_path or rel_path == '/':
            rel_path = 'index.html'

        file_path = os.path.join(ROOT_DIR, rel_path)
        
        # Fallback to index.html if file doesn't exist
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(ROOT_DIR, 'index.html')

        if os.path.exists(file_path) and os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                if file_path.endswith('.js'):
                    mime_type = 'application/javascript'
                elif file_path.endswith('.css'):
                    mime_type = 'text/css'
                elif file_path.endswith('.html'):
                    mime_type = 'text/html; charset=utf-8'
                elif file_path.endswith('.json'):
                    mime_type = 'application/json'
                else:
                    mime_type = 'application/octet-stream'

            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            if mime_type.startswith('text/html'):
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            else:
                self.send_header('Cache-Control', 'public, max-age=3600')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
            return

        self.send_response(404)
        self.end_headers()

