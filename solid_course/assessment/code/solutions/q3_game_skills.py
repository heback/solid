"""Q3 정답 코드(교사용): 스킬 약속 검사기와 LSP를 지키도록 고친 구조 (Python 3.12+)

1) contract_violations(): Skill 약속 ①②③을 실제로 시험해 어긴 항목을 돌려준다.
2) 시작 코드의 Fireball은 약속을 지키고, Berserk·Drain은 어긴다는 것을 assert로 확인.
3) 고친 구조: Berserk는 약속 안에서 동작, Drain은 Skill이 아닌 별도 RecoverySkill 계층으로.
4) 시작 코드의 실제 출력(문항 (1) 정답)을 그대로 재현해 assert로 고정.

실행: python3 q3_game_skills.py   -> 마지막 줄 "Q3 정답 코드: 모든 assert 통과"
"""
import contextlib
import importlib.util
import io
import pathlib

spec = importlib.util.spec_from_file_location(
    "q3_start", pathlib.Path(__file__).resolve().parent.parent / "q3_game_skills.py")
start = importlib.util.module_from_spec(spec)
spec.loader.exec_module(start)
Hero, Skill = start.Hero, start.Skill


def contract_violations(skill):
    """약속 ①②③ 중 어긴 번호 집합. mp 부족/충분 두 상황을 모두 시험한다."""
    broken = set()
    # 상황 A: mp 부족
    h = Hero("t", hp=50, mp=skill.cost - 1) if skill.cost > 0 else None
    if h is not None:
        r = skill.use(h)
        if r != 0 or h.mp != skill.cost - 1:
            broken.add("①")
        if h.hp != 50:
            broken.add("③")
    # 상황 B: mp 충분(보너스 조건 둘 다)
    for mp in (skill.cost, skill.cost + 30):
        h = Hero("t", hp=50, mp=mp)
        r = skill.use(h)
        if not isinstance(r, int) or r < 0 or h.mp != mp - skill.cost:
            broken.add("②")
        if h.hp != 50:
            broken.add("③")
    return broken


# ---- 고친 구조 ----------------------------------------------------------
class Berserk(Skill):
    """mp가 충분할 때만 발동, 대신 피해 2배. 약속 ①②③ 모두 지킴."""
    def use(self, hero):
        if hero.mp < self.cost:
            return 0
        hero.mp -= self.cost
        return self.power * 2


class RecoverySkill:
    """회복 계열은 '피해를 주는 스킬'의 약속과 다르므로 별도 계층(별도 약속)으로 둔다.
    약속: mp가 cost 이상이면 cost만큼 줄이고 hp를 회복, 회복량(0 이상)을 돌려준다."""
    def __init__(self, name, cost, amount):
        self.name, self.cost, self.amount = name, cost, amount

    def apply(self, hero):
        if hero.mp < self.cost:
            return 0
        hero.mp -= self.cost
        hero.hp += self.amount
        return self.amount


class Drain(RecoverySkill):
    pass


if __name__ == "__main__":
    # (2) 위반 판정 근거: 실제 검사 결과
    assert contract_violations(start.Fireball("화염구", 10, 30)) == set()
    assert contract_violations(start.Skill("베기", 0, 10)) == set()
    assert contract_violations(start.Berserk("광폭", 12, 20)) == {"①", "③"}
    assert contract_violations(start.Drain("흡수", 8, 15)) == {"①", "②", "③"}

    # (3) 고친 구조는 약속을 지키고, Drain은 더 이상 Skill이 아니다
    assert contract_violations(Berserk("광폭", 12, 20)) == set()
    assert not isinstance(Drain("흡수", 8, 15), Skill)
    h = Hero("린", 40, 7)
    assert Drain("흡수", 8, 15).apply(h) == 0 and (h.hp, h.mp) == (40, 7)
    h = Hero("린", 40, 25)
    assert Drain("흡수", 8, 15).apply(h) == 15 and (h.hp, h.mp) == (55, 17)

    # (1) 시작 코드의 실제 출력(문항 정답) 고정
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        hero = Hero("린", hp=40, mp=25)
        skills = [start.Fireball("화염구", 10, 30), start.Drain("흡수", 8, 15),
                  start.Berserk("광폭", 12, 20), start.Skill("베기", 0, 10)]
        left = start.auto_battle(hero, skills, boss_hp=100)
    lines = buf.getvalue().splitlines()
    assert left == 30
    assert [l.split("|")[1].strip() for l in lines] == ["보스  65", "보스  80", "보스  40", "보스  30"]
    assert lines[1].endswith("hp 55 mp 7") and lines[2].endswith("hp 43 mp 7")
    print("Q3 정답 코드: 모든 assert 통과")
