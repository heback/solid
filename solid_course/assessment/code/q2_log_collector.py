"""Q2 시작 코드: 서버 로그 수집기 (Python 3.12+)

여러 서버가 보낸 로그 문자열을 모아, 오류만 골라 파일에 저장하고
운영 회의용 요약 문장을 만든다. 이 코드는 정상 동작한다. 구조를 분석하라.

실행: python3 q2_log_collector.py
"""
import os
import tempfile


class ServerLogCollector:
    def __init__(self, path):                                   # 1
        self.path = path                                        # 2
        self.entries = []                                       # 3
                                                                # 4
    def collect(self, raw_text):                                # 5
        # 로그 한 줄 형식: "레벨|서버이름|메시지"                  # 6
        for row in raw_text.strip().splitlines():               # 7
            level, server, message = row.split("|")             # 8
            self.entries.append((level.strip(), server.strip(), message.strip()))  # 9
                                                                # 10
    def errors(self):                                           # 11
        return [e for e in self.entries if e[0] == "ERROR"]     # 12
                                                                # 13
    def save(self):                                             # 14
        with open(self.path, "w", encoding="utf-8") as f:       # 15
            for level, server, message in self.errors():        # 16
                f.write(f"{server}: {message}\n")               # 17
                                                                # 18
    def summary(self):                                          # 19
        errs = self.errors()                                    # 20
        servers = sorted({server for _, server, _ in errs})     # 21
        return f"오류 {len(errs)}건 / 서버 {', '.join(servers)}"  # 22


if __name__ == "__main__":
    raw = """
    INFO|web-1|요청 처리 완료
    ERROR|db-2|연결 시간 초과
    ERROR|web-1|응답 코드 500
    WARN|web-2|느린 응답
    ERROR|db-2|디스크 부족
    """
    out = os.path.join(tempfile.gettempdir(), "q2_errors.txt")
    c = ServerLogCollector(out)
    c.collect(raw)
    c.save()
    print(c.summary())
    with open(out, encoding="utf-8") as f:
        print(f.read(), end="")
