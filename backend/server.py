import os
import sys
import json
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Warning: requests or bs4 not installed in active environment")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

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
    """
    Parses strings like '(Week 1–14)', 'Week 1-7, 9-14', '1-14周', 'Week 1~8' into a list of integers.
    """
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
    
    # Extract student name if present, e.g. "Welcome, Student Name"
    student_name = ""
    welcome_match = re.search(r'Welcome,\s*([^<>\n\r]+)', html_content, re.IGNORECASE)
    if welcome_match:
        student_name = welcome_match.group(1).strip()
    
    # Find timetable table
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

    # Identify header columns
    header_row = rows[0]
    headers = [th.get_text().strip() for th in header_row.find_all(['th', 'td'])]
    day_indices = {}
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for idx, h in enumerate(headers):
        for day_num, day_name in enumerate(day_names, start=1):
            if day_name.lower() in h.lower():
                day_indices[idx] = (day_num, day_name)

    # Grid tracking for rowspan management
    num_cols = max(len(headers), 8)
    occupied = {} # (row_idx, col_idx) -> True
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
            
            # Check if this column maps to a day
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
    
    resp = s.post(login_url, data=payload, timeout=12)
    if "Login or password error" in resp.text or "error" in resp.url.lower():
        return {"success": False, "error": "学号或密码错误，请检查后再试 (Invalid credentials)"}
        
    # Request Timetable
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

def fetch_from_xmum_moodle(username, password):
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

SCHEDULE_FILE = os.path.join(BASE_DIR, 'data', 'user_schedule.json')
DEADLINES_FILE = os.path.join(BASE_DIR, 'data', 'user_deadlines.json')

def load_server_schedule():
    if os.path.exists(SCHEDULE_FILE):
        try:
            with open(SCHEDULE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {SCHEDULE_FILE}: {e}")
    return None

def save_server_schedule(data):
    try:
        os.makedirs(os.path.dirname(SCHEDULE_FILE), exist_ok=True)
        with open(SCHEDULE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Saved schedule to {SCHEDULE_FILE} successfully.")
        return True
    except Exception as e:
        print(f"Error saving schedule: {e}")
        return False

def load_server_deadlines():
    if os.path.exists(DEADLINES_FILE):
        try:
            with open(DEADLINES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {DEADLINES_FILE}: {e}")
    return []

def save_server_deadlines(data):
    try:
        os.makedirs(os.path.dirname(DEADLINES_FILE), exist_ok=True)
        with open(DEADLINES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Saved deadlines to {DEADLINES_FILE} successfully.")
        return True
    except Exception as e:
        print(f"Error saving deadlines: {e}")
        return False

class ScheduleAppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path).path
        if parsed_path == '/api/schedule':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            schedule = load_server_schedule()
            res = {"success": True, "schedule": schedule}
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return
            
        elif parsed_path == '/api/deadlines':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            deadlines = load_server_deadlines()
            res = {"success": True, "deadlines": deadlines}
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return
            
        super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path).path
        if parsed_path == '/api/sync':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()
                semester = data.get('semester', '2026/09')
                
                if not username or not password:
                    res = {"success": False, "error": "请输入学号和密码"}
                else:
                    res = fetch_from_xmum_ac(username, password, semester)
                    if res.get("success") and res.get("courses"):
                        schedule_to_save = {
                            "studentName": res.get("studentName", username),
                            "studentId": username,
                            "semester": semester,
                            "lastUpdated": "2026-10-08T12:00:00",
                            "courses": res.get("courses", [])
                        }
                        save_server_schedule(schedule_to_save)
            except Exception as e:
                res = {"success": False, "error": f"同步异常: {str(e)}"}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed_path == '/api/moodle_sync':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()
                
                if not username or not password:
                    res = {"success": False, "error": "请输入 Moodle 学号和密码"}
                else:
                    res = fetch_from_xmum_moodle(username, password)
                    if res.get("success") and res.get("deadlines") is not None:
                        save_server_deadlines(res.get("deadlines", []))
            except Exception as e:
                res = {"success": False, "error": f"Moodle 同步异常: {str(e)}"}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed_path == '/api/full_sync':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
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
                        if ac_res.get("success") and ac_res.get("courses"):
                            schedule_to_save = {
                                "studentName": ac_res.get("studentName", username),
                                "studentId": username,
                                "semester": semester,
                                "lastUpdated": "2026-10-08T12:00:00",
                                "courses": ac_res.get("courses", [])
                            }
                            save_server_schedule(schedule_to_save)
                    
                    if sync_moodle:
                        moodle_res = fetch_from_xmum_moodle(username, password)
                        if moodle_res.get("success") and moodle_res.get("deadlines") is not None:
                            save_server_deadlines(moodle_res.get("deadlines", []))
                    
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

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed_path == '/api/save_deadlines':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                save_server_deadlines(data)
                res = {"success": True}
            except Exception as e:
                res = {"success": False, "error": str(e)}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed_path == '/api/parse_html':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                html_code = data.get('html', '')
                res = parse_timetable_html(html_code)
                res["success"] = True
                if res.get("courses"):
                    schedule_to_save = {
                        "studentName": res.get("studentName") or "User",
                        "studentId": "",
                        "semester": "2026/09",
                        "lastUpdated": "2026-10-08T12:00:00",
                        "courses": res.get("courses", [])
                    }
                    save_server_schedule(schedule_to_save)
            except Exception as e:
                res = {"success": False, "error": f"解析失败: {str(e)}"}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        elif parsed_path == '/api/save_schedule':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                save_server_schedule(data)
                res = {"success": True}
            except Exception as e:
                res = {"success": False, "error": str(e)}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        super().do_POST()

def get_local_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def run_server(port=8080):
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, ScheduleAppHandler)
    local_ip = get_local_ip()
    print("=" * 60)
    print(f"🚀 XMUM Schedule Hub 服务已就绪！")
    print(f"💻 电脑浏览器访问:   http://localhost:{port}")
    print(f"📱 手机同局域网访问: http://{local_ip}:{port}")
    print("=" * 60)
    httpd.serve_forever()

if __name__ == '__main__':
    port = 8080
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)
