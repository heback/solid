"""Q5 시작 코드: 캠퍼스 배달 로봇 배차 (Python 3.12+)

인도(실외)만 다니는 로봇과 건물 안까지 들어가는 로봇이 있다.
배차 담당(Dispatcher)은 경로를 받아 로봇을 움직이고, 필요하면 승강기를 태운 뒤 보관함을 연다.
이 코드는 실행되지만 구조에 문제가 있다. 분석하고 문제의 요구대로 리팩터링하라.
맨 아래 공개 테스트는 수정하지 말고, 모두 [통과]가 나오게 만들어라.

실행: python3 q5_delivery_robot.py
"""
from abc import ABC, abstractmethod


class Robot(ABC):                                               # 1
    def __init__(self):                                         # 2
        self.log = []                                           # 3
                                                                # 4
    @abstractmethod                                             # 5
    def drive_to(self, place): ...                              # 6
                                                                # 7
    @abstractmethod                                             # 8
    def open_locker(self): ...                                  # 9
                                                                # 10
    @abstractmethod                                             # 11
    def ride_elevator(self, floor): ...                         # 12
                                                                # 13
                                                                # 14
class SidewalkRobot(Robot):                                     # 15
    def drive_to(self, place):                                  # 16
        self.log.append(f"이동:{place}")                         # 17
                                                                # 18
    def open_locker(self):                                      # 19
        self.log.append("보관함 열림")                            # 20
                                                                # 21
    def ride_elevator(self, floor):                             # 22
        raise NotImplementedError("인도 로봇은 승강기를 못 탄다")    # 23
                                                                # 24
                                                                # 25
class BuildingRobot(Robot):                                     # 26
    def drive_to(self, place):                                  # 27
        self.log.append(f"이동:{place}")                         # 28
                                                                # 29
    def open_locker(self):                                      # 30
        self.log.append("보관함 열림")                            # 31
                                                                # 32
    def ride_elevator(self, floor):                             # 33
        self.log.append(f"승강기:{floor}층")                      # 34
                                                                # 35
                                                                # 36
class GpsMap:                                                   # 37
    def route(self, start, goal):                               # 38
        return [start, "중앙광장", goal]                          # 39
                                                                # 40
                                                                # 41
class Dispatcher:                                               # 42
    def __init__(self):                                         # 43
        self.map = GpsMap()                                     # 44
                                                                # 45
    def deliver(self, robot, start, goal, floor=None):          # 46
        for place in self.map.route(start, goal):               # 47
            robot.drive_to(place)                               # 48
        if floor is not None:                                   # 49
            robot.ride_elevator(floor)                          # 50
        robot.open_locker()                                     # 51
        return robot.log                                        # 52


# ===================== 공개 테스트 (수정 금지) =====================
def _check(name, fn):
    try:
        fn()
        print(f"[통과] {name}")
        return True
    except Exception as e:  # 실패해도 다음 테스트를 계속 실행
        print(f"[실패] {name} -> {type(e).__name__}: {e}")
        return False


def t1_roles():
    assert issubclass(SidewalkRobot, Courier) and issubclass(BuildingRobot, Courier)
    assert issubclass(BuildingRobot, ElevatorUser)
    assert not issubclass(SidewalkRobot, ElevatorUser), "인도 로봇이 승강기 역할을 떠안고 있음"
    assert not hasattr(SidewalkRobot(), "ride_elevator"), "인도 로봇에 쓸 수 없는 메서드가 남아 있음"


def t2_injected_planner():
    class FakePlanner(RoutePlanner):            # 테스트용 가짜 경로 계획기
        def route(self, start, goal):
            return [start, goal]
    log = Dispatcher(FakePlanner()).deliver(SidewalkRobot(), "정문", "도서관 앞")
    assert log == ["이동:정문", "이동:도서관 앞", "보관함 열림"], log


def t3_building_with_floor():
    log = Dispatcher(GpsMap()).deliver(BuildingRobot(), "기숙사", "공학관", floor=4)
    assert log == ["이동:기숙사", "이동:중앙광장", "이동:공학관", "승강기:4층", "보관함 열림"], log


def t4_refuse_before_moving():
    robot = SidewalkRobot()
    try:
        Dispatcher(GpsMap()).deliver(robot, "정문", "공학관", floor=3)
    except ValueError:
        assert robot.log == [], "거절하기 전에 이미 움직였음"
        return
    raise AssertionError("승강기를 못 타는 로봇에 층 배달을 맡겼는데 ValueError가 없음")


if __name__ == "__main__":
    print("현재 동작:", Dispatcher().deliver(BuildingRobot(), "기숙사", "공학관", floor=4))  # 리팩터링 후에는 지우거나 새 구조에 맞게 고친다
    tests = [("역할 인터페이스 분리", t1_roles), ("경로 계획기 주입", t2_injected_planner),
             ("건물 로봇 층 배달", t3_building_with_floor), ("못 하는 일은 출발 전 거절", t4_refuse_before_moving)]
    passed = sum(_check(n, f) for n, f in tests)
    print(f"공개 테스트 {passed}/{len(tests)} 통과")
