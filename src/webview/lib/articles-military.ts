import type { ArticleData } from "./articles";

// Auto-generated
export default {
  "ship-classes": {
    title: {
      ko: "함급 체계",
      en: "Ship Class System",
    },
    level: "RESTRICTED",
    category: "MILITARY",
    image: "/images/vessel-silhouette.svg",
    related: [
      "visual-vessel-classification",
      "visual-vessel-implementation",
      "android-formation",
      "battle-doctrine",
      "eh-chamber",
      "energy-weapons",
      "neka-empire",
      "liberation-front",
    ],
    content: {
      ko: '3세력 함급 분류 체계 — 현실 해군 참조\n\n■ 참조 기준\n네카 제국 → 미 해군 (US Navy) — 압도적 물량, 대형, 항모전단 구조\n협의회 → 대한민국 해군 (ROKN) — 효율, 기술집약, 배치(Batch) 진화\n해방연대 → 게릴라 해군 — 고속정/잠수함 개념\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n1. 협의회 연합함대 — 한국 해군 참조\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n■ 분류 철학\n한국 해군 KDX 사업처럼 배치(Batch) 진화 체계:\nKDX-I (광개토대왕급) → KDX-II (충무공이순신급) → KDX-III (세종대왕급)\n같은 함급 안에 3타입(Batch).\n\n■ 타입 분류\n타격형 (Strike, -S): 공격 특화. 드론 최대 탑재. → 충무공이순신급 대응\n방어형 (Guard, -G): 호위/방어. 요격 드론+CWEH 강화. → 세종대왕급 대응\n지원형 (Support, -P): 정찰/전자전/보급/수리. → 독도급 대응\n\n■ 전 함급표\n\n초계함 (Corvette) — HPG-K\nHPG-KS 타격형: 3,500t / 드론 150기 / 안드로이드 35체 / 전초 공격\nHPG-KG 방어형: 4,000t / 드론 120기 / 안드로이드 40체 / Gate 근접 경비\nHPG-KP 지원형: 3,000t / 드론 80기 / 안드로이드 45체 / 정찰/조기경보\n\n프리깃 (Frigate) — HPG-F ★기준함급\nHPG-FS 타격형: 6,500t / 드론 540기 / 안드로이드 75체 / 주력 소함대 공격\nHPG-FG 방어형: 7,500t / 드론 480기 / 안드로이드 85체 / 호위·대드론 방어\nHPG-FP 지원형: 5,500t / 드론 360기 / 안드로이드 90체 / 전자전/정찰/수리\n\n구축함 (Destroyer) — HPG-D\nHPG-DS 타격형: 15,000t / 드론 1,400기 / 안드로이드 180체 / 함대 주력 타격\nHPG-DG 방어형: 18,000t / 드론 1,200기 / 안드로이드 210체 / 함대 방공/호위\nHPG-DP 지원형: 12,000t / 드론 800기 / 안드로이드 220체 / C4ISR/전자전/보급\n\n순양함 (Cruiser) — HPG-C\nHPG-CS 타격형: 42,000t / 드론 4,000기 / 안드로이드 450체 / 함대 핵심 화력\nHPG-CG 방어형: 48,000t / 드론 3,600기 / 안드로이드 520체 / 함대 지휘/방어\nHPG-CP 지원형: 36,000t / 드론 2,400기 / 안드로이드 550체 / 대규모 전자전/보급\n\n전함 (Battleship) — HPG-B\nHPG-BS 타격형: 130,000t / 드론 14,000기 / 안드로이드 1,400체 / 최대 화력. 결전 병기.\nHPG-BG 방어형: 150,000t / 드론 12,000기 / 안드로이드 1,600체 / 함대 중핵. CWEH 최대.\nHPG-BP 지원형: 100,000t / 드론 8,000기 / 안드로이드 1,800체 / 이동 사령부/대규모 수리.\n\n기함 (Flagship) — HPG-S\nHPG-S (단일): 500,000t / 드론 48,000기 / 안드로이드 6,000체 / 함대 총지휘. φ 최대 출력자만 탑승.\n기함은 타입 분류 없음. 1척이 전부를 겸함. 협의회 전체에 수 척만 존재.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n2. 네카 제국 함대 — 미 해군 참조\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n■ 분류 철학\n미 해군 항모전단(CSG) 구조. 플라이트(Flight) 진화.\n네카는 드론/AI가 없으므로 전부 인력.\n\n■ 타입 분류\n돌격형 (Assault, -A): 백병전/근접전 특화. RIDE 장갑 최대. → 강습상륙함 대응\n포격형 (Gunship, -B): 원거리 RIDE 포격. 관통빔/소각파. → 알레이버크급 대응\n지휘형 (Command, -C): 함대 지휘/화학신호 중계. → 블루릿지급 대응\n\n■ 전 함급표\n\n초계함 (Raider) — NIV-K\nNIV-KA 돌격형: 4,500t / 220명 / 고속 접근+백병\nNIV-KB 포격형: 4,000t / 200명 / 전초 포격\nNIV-KC 지휘형: 3,500t / 180명 / 정찰/통신 중계\n\n프리깃 (Hunter) — NIV-F\nNIV-FA 돌격형: 9,000t / 650명 / 백병전 주력\nNIV-FB 포격형: 8,000t / 600명 / 중거리 포격\nNIV-FC 지휘형: 7,000t / 550명 / 소함대 지휘\n\n구축함 (Legionnaire) — NIV-D\nNIV-DA 돌격형: 22,000t / 2,000명 / 주력 돌격. 트리플렉스 1열.\nNIV-DB 포격형: 20,000t / 1,800명 / 주력 포격. 트리플렉스 2열.\nNIV-DC 지휘형: 18,000t / 1,600명 / 군단 지휘/화학신호 증폭.\n\n순양함 (Centurion) — NIV-C\nNIV-CA 돌격형: 65,000t / 5,500명 / 대형 백병. 기사 대대 수송.\nNIV-CB 포격형: 60,000t / 5,000명 / 장거리 관통빔.\nNIV-CC 지휘형: 55,000t / 4,500명 / 군단 사령부.\n\n전함 (Praetorian) — NIV-B\nNIV-BA 돌격형: 220,000t / 16,000명 / 최대 백병. 선체포 탑재.\nNIV-BB 포격형: 200,000t / 15,000명 / 선체포 특화. 트리아리 3열.\nNIV-BC 지휘형: 180,000t / 14,000명 / 대군단 지휘/화학신호 허브.\n\n황제함 (Imperator) — NIV-E\nNIV-E (단일): 1,200,000t / 80,000명 / 이동 수도. 12대군단 총지휘. 왕좌 탑재.\n틴타핀 전용. 4km. 시코르 프리마의 왕좌전이 함선 안에 복제. "황제가 있는 곳이 시코르다."\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n3. 해방 연대 — 게릴라 해군\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n정규 해군이 아님. 타입 분류 없음. 있는 걸로 싸움.\n\n바늘함 (Needle) — MR-N: 200t / 드론 6기 / 1명 / 기습/정찰. 90초 교전 후 이탈.\n가시함 (Thorn) — MR-T: 800t / 드론 24기 / 1명 / 소규모 화력전. 바늘함 5척 지휘.\n뿌리함 (Root) — MR-R: 3,000t / 드론 96기 / 1~3명 / 이동 거점. 세포 기지함. 수리/보급.\n\n바늘함 10~20척이 1개 전선 세포.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n4. 프리깃 기준 비교\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n협의회 HPG-FS: 6,500t / 1명 / 드론 540기 / EH 반응형 장갑 / 기술 우세\n네카 NIV-FA: 9,000t / 650명 / 드론 0 / RIDE 합금 장갑 / 물량+장갑 우세\n해방연대 MR-T: 800t / 1명 / 드론 24기 / 경장갑 / 은닉 우세\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n5. 함급 명명 규칙\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n■ 협의회 — 한국식 (인물+개념)\n초계함: HPG 원년 기술자 이름 ("카터급", "첸급")\n프리깃: HPG 원년 인물 이름 ("미래급", "바스케스급")\n구축함: HPG 핵심 개념 ("정산급(Settlement)", "여백급(Margin)")\n순양함: 정사 인물 이름 ("민아급", "에이든급")\n전함: 절대 전제 ("기록급(Record)")\n기함: 개체명. 수 척뿐.\n\n■ 네카 — 라틴 군사 용어\n초계함: 레이더(Raider) / Explorator\n프리깃: 헌터(Hunter) / Venator\n구축함: 레기오네르(Legionnaire) / Legionarius\n순양함: 센추리온(Centurion) / Centurio\n전함: 프레토리안(Praetorian) / Praetorianus\n황제함: 임페라토르(Imperator) / Imperator\n\n■ 해방 연대 — 자연물\n바늘함 Needle: 찌르고 빠진다\n가시함 Thorn: 아프게 한다\n뿌리함 Root: 뽑히지 않는다',
      en: 'Three-Faction Ship Class System — Real Navy Reference\n\n■ Reference Basis\nNeka Empire → US Navy — Overwhelming numbers, large-scale, carrier strike group structure\nCouncil → Republic of Korea Navy (ROKN) — Efficiency, tech-intensive, Batch evolution\nLiberation Front → Guerrilla navy — Fast attack craft/submarine concepts\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n1. Council Combined Fleet — ROKN Reference\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n■ Classification Philosophy\nLike the ROKN KDX program\'s Batch evolution:\nKDX-I (Gwanggaeto) → KDX-II (Chungmugong) → KDX-III (Sejong)\n3 types (Batches) within the same class.\n\n■ Type Classification\nStrike (-S): Offense-specialized. Max drone capacity. → Chungmugong-class equivalent\nGuard (-G): Escort/defense. Interceptor drones + CWEH reinforced. → Sejong-class equivalent\nSupport (-P): Recon/EW/supply/repair. → Dokdo-class equivalent\n\n■ Full Ship Class Table\n\nCorvette — HPG-K\nHPG-KS Strike: 3,500t / 150 drones / 35 androids / Forward attack\nHPG-KG Guard: 4,000t / 120 drones / 40 androids / Gate perimeter security\nHPG-KP Support: 3,000t / 80 drones / 45 androids / Recon/early warning\n\nFrigate — HPG-F ★Standard class\nHPG-FS Strike: 6,500t / 540 drones / 75 androids / Main flotilla attack\nHPG-FG Guard: 7,500t / 480 drones / 85 androids / Escort/anti-drone defense\nHPG-FP Support: 5,500t / 360 drones / 90 androids / EW/recon/repair\n\nDestroyer — HPG-D\nHPG-DS Strike: 15,000t / 1,400 drones / 180 androids / Fleet main strike\nHPG-DG Guard: 18,000t / 1,200 drones / 210 androids / Fleet air defense/escort\nHPG-DP Support: 12,000t / 800 drones / 220 androids / C4ISR/EW/supply\n\nCruiser — HPG-C\nHPG-CS Strike: 42,000t / 4,000 drones / 450 androids / Fleet core firepower\nHPG-CG Guard: 48,000t / 3,600 drones / 520 androids / Fleet command/defense\nHPG-CP Support: 36,000t / 2,400 drones / 550 androids / Large-scale EW/supply\n\nBattleship — HPG-B\nHPG-BS Strike: 130,000t / 14,000 drones / 1,400 androids / Max firepower. Decisive weapon.\nHPG-BG Guard: 150,000t / 12,000 drones / 1,600 androids / Fleet core. Max CWEH.\nHPG-BP Support: 100,000t / 8,000 drones / 1,800 androids / Mobile HQ/major repair.\n\nFlagship — HPG-S\nHPG-S (single): 500,000t / 48,000 drones / 6,000 androids / Fleet supreme command. φ max output only.\nNo type classification. One ship covers all roles. Only a few exist in the entire Council.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n2. Neka Imperial Fleet — US Navy Reference\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n■ Classification Philosophy\nUS Navy CSG structure. Flight evolution.\nNeka have no drones/AI — all living crew.\n\n■ Type Classification\nAssault (-A): Boarding/close combat specialized. Max RIDE armor. → Amphibious assault ship equiv.\nGunship (-B): Long-range RIDE bombardment. Penetrating beam/incineration wave. → Arleigh Burke equiv.\nCommand (-C): Fleet command/chemical signal relay. → Blue Ridge equiv.\n\n■ Full Ship Class Table\n\nRaider — NIV-K\nNIV-KA Assault: 4,500t / 220 crew / High-speed approach + boarding\nNIV-KB Gunship: 4,000t / 200 crew / Forward bombardment\nNIV-KC Command: 3,500t / 180 crew / Recon/comms relay\n\nHunter — NIV-F\nNIV-FA Assault: 9,000t / 650 crew / Boarding main force\nNIV-FB Gunship: 8,000t / 600 crew / Mid-range bombardment\nNIV-FC Command: 7,000t / 550 crew / Flotilla command\n\nLegionnaire — NIV-D\nNIV-DA Assault: 22,000t / 2,000 crew / Main assault. Triplex 1st line.\nNIV-DB Gunship: 20,000t / 1,800 crew / Main bombardment. Triplex 2nd line.\nNIV-DC Command: 18,000t / 1,600 crew / Legion command/chemical signal amplification.\n\nCenturion — NIV-C\nNIV-CA Assault: 65,000t / 5,500 crew / Large-scale boarding. Knight battalion transport.\nNIV-CB Gunship: 60,000t / 5,000 crew / Long-range penetrating beam.\nNIV-CC Command: 55,000t / 4,500 crew / Legion HQ.\n\nPraetorian — NIV-B\nNIV-BA Assault: 220,000t / 16,000 crew / Max boarding. Hull cannon mounted.\nNIV-BB Gunship: 200,000t / 15,000 crew / Hull cannon specialized. Triarii 3rd line.\nNIV-BC Command: 180,000t / 14,000 crew / Grand legion command/chemical signal hub.\n\nImperator — NIV-E\nNIV-E (single): 1,200,000t / 80,000 crew / Mobile capital. 12 grand legions supreme command. Throne mounted.\nTintapin exclusive. 4km. Sichor Prima\'s throne hall replicated inside. "Where the Emperor is, there is Sichor."\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n3. Liberation Front — Guerrilla Navy\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nNot a regular navy. No type classification. Fight with what you have.\n\nNeedle — MR-N: 200t / 6 drones / 1 person / Raid/recon. Disengage after 90 seconds.\nThorn — MR-T: 800t / 24 drones / 1 person / Small-scale combat. Commands 5 Needles.\nRoot — MR-R: 3,000t / 96 drones / 1~3 persons / Mobile base. Cell base ship. Repair/supply.\n\n10~20 Needles = 1 frontline cell.\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n4. Frigate-Class Comparison\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nCouncil HPG-FS: 6,500t / 1 person / 540 drones / EH-reactive armor / Tech advantage\nNeka NIV-FA: 9,000t / 650 crew / 0 drones / RIDE alloy armor / Mass + armor advantage\nLiberation MR-T: 800t / 1 person / 24 drones / Light armor / Stealth advantage\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n5. Ship Naming Conventions\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n■ Council — Korean-style (People + Concepts)\nCorvette: HPG founding-year engineers ("Carter-class", "Chen-class")\nFrigate: HPG founding-year figures ("Mirae-class", "Vasquez-class")\nDestroyer: HPG core concepts ("Settlement-class", "Margin-class")\nCruiser: Canon character names ("Mina-class", "Aiden-class")\nBattleship: Absolute premise ("Record-class")\nFlagship: Individual names. Only a few.\n\n■ Neka — Latin Military Terms\nRaider / Explorator\nHunter / Venator\nLegionnaire / Legionarius\nCenturion / Centurio\nPraetorian / Praetorianus\nImperator / Imperator\n\n■ Liberation Front — Natural Objects\nNeedle: Strike and withdraw\nThorn: Cause pain\nRoot: Cannot be uprooted',
    },
  },
  "android-formation": {
    title: {
      ko: "안드로이드 편제",
      en: "Android Formation",
    },
    level: "RESTRICTED",
    category: "MILITARY",
    related: [
      "ship-classes",
      "eh-chamber",
      "noa-4th-force",
      "pilot-daily",
      "infantry-combat",
    ],
    content: {
      ko: "모든 안드로이드는 생체형. 7000년대: 생체 90% / 기계 10%.\n\n■ 메인 0번: 함선 전체 운용 통합. SJC 직접 연동. 초대 함장이 이름 부여.\n■ 3유형: 전투형 35% / 함보조형 30% / 지원형 35%\n\n■ 전투 배치 (Condition)\nIV(평시) → III(경계) → II(강화경계) → I(전투배치)\n\n■ 드론 유형: 선투형 17% / 요격형 33% / 편대형 50%",
      en: "All androids are bio-type. 7000s: 90% biological / 10% mechanical.\n\n■ Main Unit #0: Integrated ship operations. Direct SJC interface. Named by first captain.\n■ 3 Types: Combat 35% / Ship-support 30% / Support 35%\n\n■ Battle Condition Levels\nIV (Peacetime) → III (Alert) → II (Enhanced Alert) → I (Battle Stations)\n\n■ Drone Types: Vanguard 17% / Interceptor 33% / Formation 50%",
    },
  },
  "battle-doctrine": {
    title: {
      ko: "3세력 전투 교리",
      en: "Three-Faction Battle Doctrine",
    },
    level: "CLASSIFIED",
    category: "MILITARY",
    related: [
      "ship-classes",
      "engagement-range",
      "infantry-combat",
      "energy-weapons",
    ],
    content: {
      ko: '■ 협의회 — 미 항공모함 교리: 드론 투사 플랫폼. "닿지 않는 거리에서 싸운다."\n■ 네카 — 로마 군단 교리: 트리플렉스 아키에스 3열 전투. "닿는 거리까지 밀고 간다."\n■ 해방 연대 — 게릴라: 바늘함 10~20척 기습. 교전 3분 이내 이탈.\n\n■ 교리 충돌\n협의회 악몽: 기동 군단이 측면 돌입, 근접전 강요.\n네카 악몽: 드론 편대가 테스투도를 EH 파동으로 동시 타격.\n\n■ 함대전에서 보병전까지 — 동일 원리\n스케일만 바뀌고 원리는 동일하다.',
      en: '■ Council — US Carrier Doctrine: Drone projection platform. "Fight from unreachable distance."\n■ Neka — Roman Legion Doctrine: Triplex Acies 3-line battle. "Push until in reach."\n■ Liberation Front — Guerrilla: 10~20 needle-ship raids. Disengage within 3 minutes.\n\n■ Doctrinal Clash\nCouncil\'s nightmare: Mobile corps flanking, forcing close combat.\nNeka\'s nightmare: Drone formations simultaneously striking testudo with EH waves.\n\n■ Fleet Battle to Infantry — Same Principle\nOnly the scale changes. The principle is identical.',
    },
  },
  "infantry-combat": {
    title: {
      ko: "보병 전투 체계",
      en: "Infantry Combat System",
    },
    level: "CLASSIFIED",
    category: "MILITARY",
    related: [
      "battle-doctrine",
      "android-formation",
      "neka-empire",
      "ride",
      "ship-classes",
    ],
    content: {
      ko: "■ 협의회: 전투형 안드로이드가 소형 드론 3~5기 동시 조정. 근접전은 비상 수단.\n■ 네카: 기사 보병. RIDE 풀아머 40~60kg. 라이플+RIDE 대검 (90~120cm, 모스 15+). 안드로이드 1격 절단.\n■ 해방연대: 인간. 경량 방탄복. 교전 90초 이내. 정면전 ❌.\n\n■ 백병전 = 네카 압도적 유리\n2.3m 풀아머가 통로를 꽉 채움. 드론 효율 급감. 대검 1격에 절단.\n이것이 협의회가 절대 근접전을 허용하면 안 되는 이유.",
      en: "■ Council: Combat androids controlling 3~5 small drones simultaneously. Close combat is emergency only.\n■ Neka: Knight infantry. Full RIDE armor 40~60kg. Rifle + RIDE great sword (90~120cm, Mohs 15+). Androids severed in one strike.\n■ Liberation Front: Humans. Light body armor. Engagement under 90 seconds. Frontal combat ❌.\n\n■ Boarding = Overwhelmingly Neka-Favored\n2.3m full-armored knights fill corridors completely. Drone efficiency plummets. One sword strike = severance.\nThis is why the Council must never allow close combat.",
    },
  },
  "engagement-range": {
    title: {
      ko: "교전 거리 체계",
      en: "Engagement Range System",
    },
    level: "CLASSIFIED",
    category: "MILITARY",
    related: [
      "energy-weapons",
      "battle-doctrine",
      "ship-classes",
      "infantry-combat",
    ],
    content: {
      ko: "■ 극근접 (~100km): 충각전. 해방 연대만 이 거리에서 교전.\n■ 근접 (100~1,000km): 드론 교전. 선체포 발사 가능.\n■ 중거리 (1,000~10,000km): 주력 교전 거리. 가장 치열한 구간.\n■ 장거리 (10,000~50,000km): 네카 주포 유효 사거리. 인류 정밀도 급감.\n■ 극장거리 (50,000km+): 네카 전함급 이상만 도달.\n\n■ 150년 격차의 실체 = 사거리 격차\n네카는 인류가 닿지도 못하는 거리에서 먼저 쏜다.",
      en: "■ Point-blank (~100km): Ramming combat. Only Liberation Front fights at this range.\n■ Close (100~1,000km): Drone engagement. Hull cannon possible.\n■ Mid-range (1,000~10,000km): Primary engagement range. Most intense zone.\n■ Long-range (10,000~50,000km): Neka main gun effective range. Human accuracy drops sharply.\n■ Extreme (50,000km+): Only Neka battleship-class and above reach this.\n\n■ The Reality of the 150-Year Gap = Range Gap\nNeka fire first from distances humanity cannot even reach.",
    },
  },
  "visual-vessel-classification": {
    title: {
      ko: "함선 분류 도해",
      en: "Vessel Classification Visual Reference",
    },
    level: "CLASSIFIED",
    category: "MILITARY",
    image: "/images/vessel-classification.jpg",
    related: [
      "ship-classes",
      "battle-doctrine",
      "energy-weapons",
      "neka-empire",
      "liberation-front",
    ],
    content: {
      ko: "EH Universe 전 세력 함선 분류 도해 — 비밀조사국 내부 자료\n\n■ Section I: 협의회 연합함대\n코르벳 · 프리깃(기준함급) · 구축함 · 순양함 · 전함\n드론 포드 기술(Drone Pod Technology) 기반 전력 투사\n기함: Council Flagship (500,000t)\n\n■ Section II: 네카 제국 함대\nRIDE 결정체 공명 가소성 구현 — 결정 다면체 형성 · 성장 파동\n레이더 · 헌터 · 랜서 · 소버린 · 프레토리안\n황제 전용: NEKA IMPERATOR-CLASS (1,200,000t)\n\n■ Section III: 해방 연대 함대\n개조된 민간 선박 기반 · 비대칭 게릴라 운용\n니들 · 스파이크 · 쏜 · 바스티온\n\n■ Section IV: 통합 비교 및 시뮬레이션\n3세력 함급별 크기 비교 · 함대 전략 시뮬레이션",
      en: "EH Universe full vessel classification visual — Bureau of Investigation internal reference\n\n■ Section I: Council United Human Joint Fleet\nCorvette · Frigate (baseline) · Destroyer · Cruiser · Battleship\nDrone Pod Technology-based force projection\nFlagship: Council Flagship (500,000t)\n\n■ Section II: Neka Empire Fleet\nRIDE Crystal Resonance Plasticity — Crystal Faceted Hull · Growth Wave\nRaider · Hunter · Lancer · Sovereign · Praetorian\nEmperor Only: NEKA IMPERATOR-CLASS (1,200,000t)\n\n■ Section III: Liberation Front Fleet\nRepurposed civilian vessels · Asymmetric guerrilla operations\nNeedle · Spike · Thorn · Bastion\n\n■ Section IV: Unified Comparison & Simulation\nCross-faction size comparison · Fleet strategy simulation",
    },
  },
  "visual-vessel-implementation": {
    title: {
      ko: "함선 구현 도해",
      en: "Vessel Implementation Visual Reference",
    },
    level: "CLASSIFIED",
    category: "MILITARY",
    image: "/images/vessel-implementation.jpg",
    related: [
      "ship-classes",
      "ride",
      "hctg-gate",
      "gate-infra",
      "visual-vessel-classification",
    ],
    content: {
      ko: "함선 성장 및 구현 메커니즘 · Gate 기능 비교 · RIDE 에너지 관리 — 비밀조사국 내부 자료\n\n■ I. 함선 성장 및 구현\n네카 함선: RIDE 결정체 공명 가소성 → 성장 파동 → 결정 다면체 형성 → 실버 그레인 패턴 주입\n협의회 함선: 타원형 복합재 선체 제조\n\n■ II. 게이트 기능 및 크기 비교\nTier 1 Core Hub (12km) · Tier 2 Radial Corridor (6km) · Tier 3 Frontier Gate (2km) · Tier 4 Emergency Gate (1km, masked)\n함선 크기 대비 게이트 스케일 시각화\n\n■ III. RIDE 에너지 및 물질 관리\n방전(Discharge) → 완전 방전 시 절대흑(Neka normal → Neka 방전)\n고갈(Depletion) → RIDE 소진 시 재백색(Neka normal → Neka 고갈)\nRIDE 충전소(RIDE Charging Station)\n\n■ IV. 함대 전략 시뮬레이션\n함급별 전략 배치 · GREEN/BLUE/YELLOW/RED 구역별 운용",
      en: "Vessel growth mechanisms · Gate function comparison · RIDE energy management — Bureau of Investigation internal reference\n\n■ I. Vessel Growth & Implementation\nNeka vessels: RIDE Crystal Resonance Plasticity → Growth Wave → Crystal Faceted Hull → Silver Grain Pattern Injection\nCouncil vessels: Elliptical composite hull manufacturing\n\n■ II. Gate Function & Size Comparison\nTier 1 Core Hub (12km) · Tier 2 Radial Corridor (6km) · Tier 3 Frontier Gate (2km) · Tier 4 Emergency Gate (1km, masked)\nGate scale visualization relative to vessel sizes\n\n■ III. RIDE Energy & Material Management\nDischarge → Full discharge turns absolute black (Neka normal → discharged)\nDepletion → RIDE exhaustion turns ashen white (Neka normal → depleted)\nRIDE Charging Station\n\n■ IV. Fleet Strategy Simulation\nStrategic deployment by ship class · Operations across GREEN/BLUE/YELLOW/RED zones",
    },
  },
  "rpt-delta-zero-operations": {
    title: {
      ko: "Δ0 (델타 제로) 부대 작전 기록",
      en: "Δ0 (Delta Zero) Unit — Operations Log",
    },
    level: "CLASSIFIED",
    category: "MILITARY",
    content: {
      ko: '```\n┌──────────────────────────────────────────────────┐\n│  ██████████████████████████████████████████████  │\n│  ██  CLASSIFIED — NHDC 특수작전과          █████  │\n│  ██  Δ0 부대 작전 기록                     █████  │\n│  ██████████████████████████████████████████████  │\n└──────────────────────────────────────────────────┘\n```\n\n---\n\n# Δ0 (델타 제로) 부대 작전 기록\n**작성 부서:** NHDC 특수작전과\n**문서 등급:** CLASSIFIED\n**열람 인가:** 본부장 직결\n\n---\n\n## ▌ 부대 개요\n\n| 항목 | 내용 |\n|------|------|\n| 부대명 | Δ0 (델타 제로) |\n| 소속 | NHDC 특수작전과 직할 |\n| 임무 | 경계선 관리 대상 감시·추적·확보 |\n| 편제 | EH-알파 유닛 [REDACTED]명 + 관리관 [REDACTED]명 |\n| 작전 범위 | 대한민국 전역 |\n\n---\n\n## ▌ 주요 임무\n\n**1. 이탈자 추적**\nNHDC에서 이탈한 고가치 자산의 위치 파악 및 확보.\n\n**2. 경계선 관리 대상 감시**\n비공식 Alpha 등 측정 범위 초과 개체의 행동 모니터링.\n\n**3. 하한선 미달 개체 수거**\n하한선 상향 시 발생하는 대량 재분류 대상의 현장 집행.\n\n---\n\n## ▌ 작전 이력 (주요)\n\n| 작전명 | 시기 | 대상 | 결과 |\n|--------|------|------|------|\n| 감시-091 | 2005~2025 | 신민아 (K-091 연관) | 20년 감시 — 폭로 사전 차단 **실패** |\n| 감시-102 | [REDACTED] | 이루아 (K-102) | [REDACTED] |\n| 하한선-12 | [전산 마비+48h] | C등급 하위 45만 명 | 일괄 재분류 집행 **완료** |\n| 하수도 차단 | [REDACTED] | 신민아 탈출 경로 | 탈출 **성공** (부대 실패) |\n\n---\n\n## ▌ 작전 수행 방식\n\n```\n명령 수신 (본부장 직결)\n    ↓\nEH-알파 유닛 출동\n    ↓\n대상 위치 확인 (인식표 추적 / 수동 수색)\n    ↓\n확보 또는 처분\n    ↓\n기록: "처리 완료"\n```\n\n**특이사항:**\nΔ0 부대원(EH-알파)은 안식 v4.0 투여 상태로 작전 수행.\n대상에 대한 감정적 반응 없음.\n단, 약물 중단 시 기억 역류 위험 존재.\n\n---\n\n## ▌ 하한선-12 작전 상세\n\n전산 마비 +48시간.\n하한선 12% 상향 의결 즉시 집행.\n\n| 항목 | 수치 |\n|------|------|\n| 재분류 대상 | 약 45만 명 |\n| 출동 유닛 수 | [REDACTED] |\n| 집행 소요 시간 | [REDACTED] |\n| 비명 기록 여부 | 기록되지 않음 |\n| 저항 발생 건수 | 기록되지 않음 |\n\n**현장 보고 전문:**\n> *"전국 타자기 일제 가동. [등급: E] 일괄 출력.*\n> *인식표 붉은색 점멸 시작.*\n> *진압 강도: 효율적 강화 완료."*\n\n---\n\n## ▌ 특수작전과 소견\n\n> *"Δ0은 이 나라의 그림자다.*\n> *존재하지만 기록되지 않는다.*\n> *기록되지 않는 것은 없었던 일이 된다.*\n> *그것이 Δ0의 존재 이유다."*\n\n---\n\n```\n┌──────────────────────────────────────────────────┐\n│  본 문서는 NHDC 본부장 직결 기밀이다.             │\n│  Δ0 부대의 존재 자체가 기밀이다.                  │\n│  이 문서를 읽은 자는 이미 대상이다.               │\n└──────────────────────────────────────────────────┘\n```\n\n*문서 번호: NHDC-D0-OPS-001 | 분류: CLASSIFIED | 특수작전과*',
      en: '```\n┌──────────────────────────────────────────────────┐\n│  ██████████████████████████████████████████████  │\n│  ██  CLASSIFIED — NHDC Special Operations  █████  │\n│  ██  Δ0 Unit Operations Log                █████  │\n│  ██████████████████████████████████████████████  │\n└──────────────────────────────────────────────────┘\n```\n\n---\n\n# Δ0 (Delta Zero) Unit — Operations Log\n**Author: NHDC Special Operations Division**\n**Classification: CLASSIFIED**\n**Access: Direct to Director General**\n\n---\n\n## ▌ Unit Overview\n\n| Item | Details |\n|------|---------|\n| Designation | Δ0 (Delta Zero) |\n| Affiliation | NHDC Special Operations Division (direct command) |\n| Mission | Surveillance, pursuit, and acquisition of borderline targets |\n| Composition | EH-Alpha units [REDACTED] + Supervisors [REDACTED] |\n| Operational Range | Republic of Korea, nationwide |\n\n---\n\n## ▌ Primary Missions\n\n**1. Defector Pursuit**\nLocate and secure high-value assets that have defected from NHDC.\n\n**2. Borderline Target Surveillance**\nMonitor behavior of entities exceeding measurement range, including unofficial Alphas.\n\n**3. Below-Baseline Entity Collection**\nField enforcement of mass reclassification targets generated upon Baseline adjustment.\n\n---\n\n## ▌ Operational History (Major)\n\n| Operation | Period | Target | Outcome |\n|-----------|--------|--------|---------|\n| Watch-091 | 2005–2025 | Shin Min-a (K-091 linked) | 20-year surveillance — pre-exposure intercept **FAILED** |\n| Watch-102 | [REDACTED] | Lee Ru-a (K-102) | [REDACTED] |\n| Baseline-12 | [System Failure+48h] | 450,000 C-Grade lower tier | Batch reclassification enforcement **COMPLETE** |\n| Sewer Lockdown | [REDACTED] | Shin Min-a escape route | Escape **SUCCESSFUL** (unit failure) |\n\n---\n\n## ▌ Operational Method\n\n```\nCommand Reception (Director General direct)\n    ↓\nEH-Alpha Unit Deployment\n    ↓\nTarget Location Confirmed (ID tag tracking / manual search)\n    ↓\nAcquisition or Disposal\n    ↓\nRecord: "Processing Complete"\n```\n\n**Special Note:**\nΔ0 operatives (EH-Alpha) conduct operations under Ansik v4.0 administration.\nNo emotional response to targets.\nHowever, memory backflow risk exists upon drug cessation.\n\n---\n\n## ▌ Operation Baseline-12 — Details\n\nSystem Failure +48 hours.\nExecuted immediately upon Baseline 12% upward adjustment resolution.\n\n| Item | Figures |\n|------|---------|\n| Reclassification targets | Approx. 450,000 |\n| Units deployed | [REDACTED] |\n| Execution duration | [REDACTED] |\n| Screams recorded | Not recorded |\n| Resistance incidents | Not recorded |\n\n**Field Report — Full Text:**\n> *"Nationwide typewriters activated simultaneously. [Grade: E] batch output.*\n> *ID tags begin red flashing.*\n> *Suppression intensity: Efficient enhancement complete."*\n\n---\n\n## ▌ Special Operations Assessment\n\n> *"Δ0 is the shadow of this nation.*\n> *It exists but is not recorded.*\n> *What is not recorded never happened.*\n> *That is the reason Δ0 exists."*\n\n---\n\n```\n┌──────────────────────────────────────────────────┐\n│  This document is classified under NHDC          │\n│  Director General direct authority.              │\n│  The existence of Δ0 is itself classified.       │\n│  If you are reading this, you are already a      │\n│  target.                                         │\n└──────────────────────────────────────────────────┘\n```\n\n*Document No: NHDC-D0-OPS-001 | Classification: CLASSIFIED | Special Operations Division*',
    },
  },
  "rpt-second-war-report": {
    title: {
      ko: "제2차 전쟁 경과 보고서",
      en: "Second War Progress Report",
    },
    level: "CLASSIFIED",
    category: "MILITARY",
    content: {
      ko: '```\n┌──────────────────────────────────────────────────┐\n│  ██████████████████████████████████████████████  │\n│  ██  AK (Advanced Korea) 전략기획실        █████  │\n│  ██  제2차 전쟁 경과 보고서                █████  │\n│  ██  문서 등급: CLASSIFIED                 █████  │\n│  ██████████████████████████████████████████████  │\n└──────────────────────────────────────────────────┘\n```\n\n---\n\n# 제2차 전쟁 경과 보고서\n**작성 부서:** AK 전략기획실\n**문서 등급:** CLASSIFIED\n**보고 기간:** 2089~2092년 (3년간)\n\n---\n\n## ▌ 전쟁 개시\n\n| 항목 | 내용 |\n|------|------|\n| 개시일 | 2089년 4월 25일 |\n| 촉발 사건 1 | AK 최고 의장 암살 |\n| 촉발 사건 2 | 신민아 사망 (향년 100세) |\n| 종전일 | 2092년 |\n| 전쟁 기간 | **3년** |\n\n---\n\n## ▌ 촉발 사건 — 2089년 4월 25일\n\n같은 날, 두 사건이 동시 발생:\n\n```\n2089년 4월 25일\n    ├── AK 최고 의장: 지상 공식 일정 중 피살\n    │       └── 가해 세력: 불명\n    │\n    └── 신민아: 사망 (100세)\n            └── 사인: [REDACTED]\n```\n\n두 사건의 연관성: [REDACTED]\n\n---\n\n## ▌ 전쟁 경과\n\n| 시기 | 사건 |\n|------|------|\n| 2089년 4월 | 개전. AK 내부 혼란 |\n| 2089년 하반기 | [REDACTED] |\n| 2090년 | [REDACTED] |\n| 2091년 | [REDACTED] |\n| 2092년 | 종전. 에이든에 의한 장부 작성 |\n\n---\n\n## ▌ 전쟁의 성격\n\n이 전쟁은 외부 침략이 아니었다.\n내부 갈등이었다.\n\n> *인류 vs 인류.*\n> *따라서 비개입 원칙 적용.*\n> *따라서 비밀조사국 불개입.*\n> *따라서 기록만 남김.*\n\n---\n\n## ▌ 피해 규모\n\n| 항목 | 수치 |\n|------|------|\n| 사상자 | [REDACTED] |\n| 영향 범위 | 지구권 한정 |\n| 은하 전체 영향 | 미미 |\n| HPP 발동 여부 | **미발동** |\n\n---\n\n## ▌ 종전 이후\n\n**에이든의 장부 (2092년):**\n전쟁 종결과 동시에 에이든이 기록한 장부.\n신민아의 만년필(1989년산)에서 시작된 기록 계승선의 두 번째 항목.\n\n```\n신민아의 만년필 (1989년산)\n    ↓\n에이든의 장부 (2092년)     ← 여기\n    ↓\n제이든 카터의 수첩 (2095~2135년)\n    ↓\n카터스 레코드 (7000년대)\n```\n\n---\n\n## ▌ 전략기획실 총평\n\n> *"제2차 전쟁은 신민아가 열어놓은 문을 통해 터져 나온 것이다.*\n> *신민아는 문을 열었을 뿐, 전쟁을 일으키지 않았다.*\n> *전쟁은 이미 문 안에 있었다."*\n\n---\n\n```\n┌──────────────────────────────────────────────────┐\n│  본 문서는 AK 전략기획실 기밀이다.                │\n│  비개입 원칙에 따라 기록만 보존한다.               │\n└──────────────────────────────────────────────────┘\n```\n\n*문서 번호: AK-WAR2-001 | 분류: CLASSIFIED | 전략기획실*',
      en: "```\n┌──────────────────────────────────────────────────┐\n│  ██████████████████████████████████████████████  │\n│  ██  AK (Advanced Korea) Strategic Planning █████  │\n│  ██  Second War Progress Report             █████  │\n│  ██  Classification: CLASSIFIED             █████  │\n│  ██████████████████████████████████████████████  │\n└──────────────────────────────────────────────────┘\n```\n\n---\n\n# Second War Progress Report\n**Author: AK Strategic Planning Office**\n**Classification: CLASSIFIED**\n**Reporting Period: 2089–2092 (3 years)**\n\n---\n\n## ▌ War Commencement\n\n| Item | Details |\n|------|---------|\n| Start Date | April 25, 2089 |\n| Triggering Event 1 | Assassination of AK Supreme Chairman |\n| Triggering Event 2 | Death of Shin Min-a (age 100) |\n| End Date | 2092 |\n| Duration | **3 years** |\n\n---\n\n## ▌ Triggering Events — April 25, 2089\n\nTwo events occurred simultaneously on the same day:\n\n```\nApril 25, 2089\n    ├── AK Supreme Chairman: Killed during official ground schedule\n    │       └── Perpetrator: Unknown\n    │\n    └── Shin Min-a: Died (age 100)\n            └── Cause of death: [REDACTED]\n```\n\nCorrelation between the two events: [REDACTED]\n\n---\n\n## ▌ War Progression\n\n| Period | Event |\n|--------|-------|\n| April 2089 | War begins. Internal AK turmoil |\n| Late 2089 | [REDACTED] |\n| 2090 | [REDACTED] |\n| 2091 | [REDACTED] |\n| 2092 | War ends. Aiden's Ledger compiled |\n\n---\n\n## ▌ Nature of the War\n\nThis war was not an external invasion.\nIt was an internal conflict.\n\n> *Human vs human.*\n> *Therefore: Non-Intervention Principle applies.*\n> *Therefore: Secret Investigation Bureau does not intervene.*\n> *Therefore: Only records are kept.*\n\n---\n\n## ▌ Damage Assessment\n\n| Item | Figures |\n|------|---------|\n| Casualties | [REDACTED] |\n| Affected Area | Earth sphere only |\n| Galaxy-wide Impact | Negligible |\n| HPP Activation | **Not activated** |\n\n---\n\n## ▌ Post-War\n\n**Aiden's Ledger (2092):**\nThe ledger compiled by Aiden upon the war's conclusion.\nThe second entry in the record lineage that began with Shin Min-a's fountain pen (manufactured 1989).\n\n```\nShin Min-a's Fountain Pen (mfg. 1989)\n    ↓\nAiden's Ledger (2092)              ← Here\n    ↓\nJayden Carter's Notebooks (2095–2135)\n    ↓\nCarter's Record (7000s)\n```\n\n---\n\n## ▌ Strategic Planning Assessment\n\n> *\"The Second War erupted through the door Shin Min-a left open.*\n> *She opened the door. She did not cause the war.*\n> *The war was already inside.\"*\n\n---\n\n```\n┌──────────────────────────────────────────────────┐\n│  This document is classified under AK Strategic  │\n│  Planning. Per the Non-Intervention Principle,   │\n│  only records are preserved.                     │\n└──────────────────────────────────────────────────┘\n```\n\n*Document No: AK-WAR2-001 | Classification: CLASSIFIED | Strategic Planning Office*",
    },
  },
} as Record<string, ArticleData>;
