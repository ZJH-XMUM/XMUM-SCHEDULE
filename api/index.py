from http.server import BaseHTTPRequestHandler
import json
import re
import urllib.parse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    pass

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
    clean = re.sub(r'[^\d,\-–]', '', week_str)
    weeks = set()
    parts = clean.split(',')
    for part in parts:
        part = part.strip()
        if not part:
            continue
        range_match = re.split(r'[\-–]', part)
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
                lines = [l.strip() for l in cell_text.split("\n") if l.strip()]
                
                code = lines[0] if len(lines) > 0 else "COURSE"
                name = lines[1] if len(lines) > 1 else code
                instructor = lines[2] if len(lines) > 2 else "Lecturer"
                location = lines[3] if len(lines) > 3 else "TBA"
                weeks_str = lines[4] if len(lines) > 4 else "(Week 1–14)"
                
                for l in lines:
                    if "week" in l.lower() or "wk" in l.lower():
                        weeks_str = l
                        break
                        
                start_slot_idx = r_idx - 1
                slot_info = TIME_SLOTS[start_slot_idx] if start_slot_idx < len(TIME_SLOTS) else TIME_SLOTS[0]
                end_slot_idx = min(start_slot_idx + rowspan - 1, len(TIME_SLOTS) - 1)
                end_slot_info = TIME_SLOTS[end_slot_idx]
                
                course_obj = {
                    "id": f"{code}-{day_num}-{r_idx}",
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
        
        parsed_path = urllib.parse.urlparse(self.path).path
        
        if parsed_path.endswith('/sync'):
            try:
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username', '').strip()
                password = data.get('password', '').strip()
                semester = data.get('semester', '2026/09')
                
                if not username or not password:
                    res = {"success": False, "error": "请输入学号和密码"}
                else:
                    res = fetch_from_xmum_ac(username, password, semester)
            except Exception as e:
                res = {"success": False, "error": f"请求解析异常: {str(e)}"}

        elif parsed_path.endswith('/parse_html'):
            try:
                data = json.loads(post_data.decode('utf-8'))
                html_code = data.get('html', '')
                res = parse_timetable_html(html_code)
                res["success"] = True
            except Exception as e:
                res = {"success": False, "error": f"解析失败: {str(e)}"}
        else:
            res = {"success": False, "error": "Not Found"}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "XMUM API online"}).encode('utf-8'))
