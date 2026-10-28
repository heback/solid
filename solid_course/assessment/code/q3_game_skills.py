"""Q3 시작 코드: 게임 캐릭터 스킬 (Python 3.12+)

전투 시스템(auto_battle)은 Skill의 약속만 믿고 작성되었다.
실행 전에 출력을 먼저 예측하라.

실행: python3 q3_game_skills.py
"""


class Hero:
    def __init__(self, name, hp, mp):
        self.name, self.hp, self.mp = name, hp, mp


class Skill:
    """Skill의 약속(모든 스킬이 지켜야 함)
    ① 사용 전: mp가 cost보다 적으면 아무것도 바꾸지 않고 0을 돌려준다.
    ② 사용 후: mp를 정확히 cost만큼 줄이고, 0 이상의 피해량(int)을 돌려준다.
    ③ hp는 스킬 사용으로 바뀌지 않는다.
    """
    def __init__(self, name, cost, power):
        self.name, self.cost, self.power = name, cost, power

    def use(self, hero):
        if hero.mp < self.cost:
            return 0
        hero.mp -= self.cost
        return self.power


class Fireball(Skill):
    """mp가 20 이상 남아 있으면 피해 +5"""
    def use(self, hero):
        bonus = 5 if hero.mp >= 20 else 0
        damage = super().use(hero)
        return damage + bonus if damage > 0 else 0


class Berserk(Skill):
    """mp가 모자라면 hp를 대신 써서라도 발동한다"""
    def use(self, hero):
        if hero.mp < self.cost:
            hero.hp -= self.cost
            return self.power * 2
        return super().use(hero)


class Drain(Skill):
    """적의 생명력을 빼앗아 자신을 회복한다(피해량을 음수로 표시)"""
    def use(self, hero):
        hero.mp -= self.cost
        hero.hp += self.power
        return -self.power


def auto_battle(hero, skills, boss_hp):
    for skill in skills:
        damage = skill.use(hero)
        boss_hp -= damage
        print(f"{skill.name:<4} 피해 {damage:>3} | 보스 {boss_hp:>3} | {hero.name} hp {hero.hp} mp {hero.mp}")
    return boss_hp


if __name__ == "__main__":
    hero = Hero("린", hp=40, mp=25)
    skills = [Fireball("화염구", 10, 30), Drain("흡수", 8, 15),
              Berserk("광폭", 12, 20), Skill("베기", 0, 10)]
    left = auto_battle(hero, skills, boss_hp=100)
    print("남은 보스 hp:", left)
