// MLM 시스템 설정
const CONFIG = {
    DAILY_BONUS_RATE: 0.01,
    SPONSOR_BONUS_RATE: 0.05,
    REFERRAL_BONUS_RATE: 0.07,
    RANK_BONUS_RATE: 0.5,
    QUALIFICATION_MULTIPLIER: 3,
    MIN_WITHDRAWAL: 35,
    RECRUITMENT_RATE: {
        DAILY: 20,
        WEEKLY: 100
    },
    RETENTION_RATE: 0.7, // 70% (100% - 30% 이탈률)
    LEVEL_DURATION: 5 // 평균 레벨 유지 기간 (일)
};

// 레벨별 기본 데이터 초기화
const initializeLevelData = () => {
    return Array.from({length: 8}, (_, i) => ({
        level: i + 1,
        joinFee: 200 * Math.pow(2, i),
        currentMembers: 0,
        sales: 0,
        sponsorBonus: 0,
        referralBonus: 0,
        rankBonus: 0,
        dailyBonus: 0,
        requalificationDays: 0
    }));
};

let levelData = initializeLevelData();

// 초기화 함수
const initialize = () => {
    createInputTable();
    attachEventListeners();
};

// 입력 테이블 생성
const createInputTable = () => {
    const tbody = document.getElementById('levelInputBody');
    tbody.innerHTML = `
        <thead>
            <tr>
                <th>레벨</th>
                <th>회원수</th>
                <th>매출</th>
                <th>후원수당</th>
                <th>추천보너스</th>
                <th>직급보너스</th>
                <th>데일리수당</th>
                <th>재가입필요시점</th>
            </tr>
        </thead>
        <tbody>
            ${levelData.map(level => `
                <tr>
                    <td>${level.level}</td>
                    <td><input type="number" min="0" value="${level.currentMembers}" 
                        id="level${level.level}Members" class="member-input"></td>
                    <td id="sales${level.level}">$0</td>
                    <td id="sponsorBonus${level.level}">$0</td>
                    <td id="referralBonus${level.level}">$0</td>
                    <td id="rankBonus${level.level}">$0</td>
                    <td id="dailyBonus${level.level}">$0/일</td>
                    <td id="requalification${level.level}">-</td>
                </tr>
            `).join('')}
        </tbody>
    `;
};

// 이벤트 리스너 연결
const attachEventListeners = () => {
    document.getElementById('calculateBtn').addEventListener('click', performAnalysis);
    document.querySelectorAll('.member-input').forEach(input => {
        input.addEventListener('change', validateInput);
    });
};

// 입력값 유효성 검사
const validateInput = (event) => {
    const value = parseInt(event.target.value);
    if (value < 0) {
        showWarning("회원 수는 0보다 작을 수 없습니다.");
        event.target.value = 0;
    }
    updateLevelCalculations(event.target.id);
};

// 분석 수행
const performAnalysis = () => {
    updateCurrentMembers();
    calculateTotals();
    assessRisk();
    updateDetailedAnalysis();
};

// 레벨별 계산 업데이트 (새로운 함수)
const updateLevelCalculations = (inputId) => {
    const level = parseInt(inputId.replace('level', '').replace('Members', ''));
    const members = parseInt(document.getElementById(inputId).value) || 0;
    const levelData = calculateLevelData(level, members);
    
    // 각 항목 업데이트
    document.getElementById(`sales${level}`).textContent = 
        `$${levelData.sales.toLocaleString()}`;
    document.getElementById(`sponsorBonus${level}`).textContent = 
        `$${levelData.sponsorBonus.toLocaleString()}`;
    document.getElementById(`referralBonus${level}`).textContent = 
        `$${levelData.referralBonus.toLocaleString()}`;
    document.getElementById(`rankBonus${level}`).textContent = 
        `$${levelData.rankBonus.toLocaleString()}`;
    document.getElementById(`dailyBonus${level}`).textContent = 
        `$${levelData.dailyBonus.toLocaleString()}/일`;
    document.getElementById(`requalification${level}`).textContent = 
        `${levelData.requalificationDays}일`;
        
    // 전체 분석 업데이트 트리거
    performAnalysis();
};

// 레벨별 데이터 계산 (새로운 함수)
const calculateLevelData = (level, members) => {
    const joinFee = 200 * Math.pow(2, level - 1);
    const sales = members * joinFee;
    const sponsorBonus = level > 1 ? sales * CONFIG.SPONSOR_BONUS_RATE : 0;
    const referralBonus = level > 1 ? sales * CONFIG.REFERRAL_BONUS_RATE : 0;
    const rankBonus = level > 1 ? sales * CONFIG.RANK_BONUS_RATE : 0;
    const dailyBonus = sales * CONFIG.DAILY_BONUS_RATE;
    
    // 재가입 필요시점 계산
    const totalDailyEarnings = sponsorBonus + referralBonus + rankBonus + dailyBonus;
    const requalificationDays = totalDailyEarnings > 0 ? 
        Math.ceil((joinFee * CONFIG.QUALIFICATION_MULTIPLIER) / totalDailyEarnings) : 0;
    
    return {
        sales,
        sponsorBonus,
        referralBonus,
        rankBonus,
        dailyBonus,
        requalificationDays
    };
};


// 현재 회원수 업데이트
const updateCurrentMembers = () => {
    levelData.forEach(level => {
        const input = document.getElementById(`level${level.level}Members`);
        level.currentMembers = parseInt(input.value) || 0;
    });
};

// 총계 계산
const calculateTotals = () => {
    const totals = levelData.reduce((acc, level) => {
        const levelSales = level.currentMembers * level.joinFee;
        const sponsorBonus = level.level > 1 ? levelSales * CONFIG.SPONSOR_BONUS_RATE : 0;
        const referralBonus = level.level > 1 ? levelSales * CONFIG.REFERRAL_BONUS_RATE : 0;
        const rankBonus = level.level > 1 ? levelSales * CONFIG.RANK_BONUS_RATE : 0;
        const dailyBonus = levelSales * CONFIG.DAILY_BONUS_RATE;

        return {
            members: acc.members + level.currentMembers,
            sales: acc.sales + levelSales,
            bonuses: acc.bonuses + sponsorBonus + referralBonus + rankBonus + dailyBonus
        };
    }, { members: 0, sales: 0, bonuses: 0 });

    updateTotalDisplay(totals);
};

// 리스크 평가
const assessRisk = () => {
    const totalSales = levelData.reduce((sum, level) => 
        sum + (level.currentMembers * level.joinFee), 0);
    const totalBonuses = calculateTotalBonuses();
    const bonusRatio = totalBonuses / totalSales;
    
    let riskLevel;
    let sustainabilityPeriod;
    
    if (bonusRatio > 0.8) {
        riskLevel = '높음';
        sustainabilityPeriod = '30일 미만';
    } else if (bonusRatio > 0.6) {
        riskLevel = '중간';
        sustainabilityPeriod = '30-90일';
    } else {
        riskLevel = '낮음';
        sustainabilityPeriod = '90일 이상';
    }

    updateRiskDisplay(riskLevel, sustainabilityPeriod);
    calculateRecommendedRecruitmentRate(bonusRatio);
};

// 재가입 필요시점 계산
const calculateRequalificationPeriod = (level) => {
    const totalBonusRate = CONFIG.SPONSOR_BONUS_RATE + 
                          CONFIG.REFERRAL_BONUS_RATE + 
                          CONFIG.RANK_BONUS_RATE + 
                          (CONFIG.DAILY_BONUS_RATE * 30); // 30일 기준
    
    const daysToRequalification = Math.floor(
        (level.joinFee * CONFIG.QUALIFICATION_MULTIPLIER) / 
        (level.joinFee * totalBonusRate)
    );
    
    return daysToRequalification;
};

// 권장 회원모집 속도 계산
const calculateRecommendedRecruitmentRate = (bonusRatio) => {
    let recommendedDaily;
    if (bonusRatio > 0.8) {
        recommendedDaily = Math.floor(CONFIG.RECRUITMENT_RATE.DAILY * 0.5);
    } else if (bonusRatio > 0.6) {
        recommendedDaily = Math.floor(CONFIG.RECRUITMENT_RATE.DAILY * 0.7);
    } else {
        recommendedDaily = CONFIG.RECRUITMENT_RATE.DAILY;
    }

    document.getElementById('recommendedRecruitmentRate').textContent = 
        `일 ${recommendedDaily}명 / 주 ${recommendedDaily * 5}명`;
};

// 총 보너스 계산
const calculateTotalBonuses = () => {
    return levelData.reduce((total, level) => {
        const levelSales = level.currentMembers * level.joinFee;
        const sponsorBonus = level.level > 1 ? levelSales * CONFIG.SPONSOR_BONUS_RATE : 0;
        const referralBonus = level.level > 1 ? levelSales * CONFIG.REFERRAL_BONUS_RATE : 0;
        const rankBonus = level.level > 1 ? levelSales * CONFIG.RANK_BONUS_RATE : 0;
        const dailyBonus = levelSales * CONFIG.DAILY_BONUS_RATE;
        
        return total + sponsorBonus + referralBonus + rankBonus + dailyBonus;
    }, 0);
};

const updateDetailedAnalysis = () => {
    levelData.forEach((level, index) => {
        const members = parseInt(document.getElementById(`level${level.level}Members`).value) || 0;
        const calculations = calculateLevelData(level.level, members);
        
        // 데이터 저장
        levelData[index] = {
            ...level,
            currentMembers: members,
            ...calculations
        };
        
        // 화면 업데이트
        updateLevelCalculations(`level${level.level}Members`);
    });
    
    // 전체 요약 업데이트
    calculateTotals();
    assessRisk();
};

// 총계 디스플레이 업데이트
const updateTotalDisplay = (totals) => {
    document.getElementById('totalMembers').textContent = totals.members.toLocaleString();
    document.getElementById('totalSales').textContent = totals.sales.toLocaleString();
    document.getElementById('totalBonuses').textContent = totals.bonuses.toLocaleString();
    document.getElementById('companyProfit').textContent = 
        (totals.sales - totals.bonuses).toLocaleString();
};

// 리스크 디스플레이 업데이트
const updateRiskDisplay = (riskLevel, sustainabilityPeriod) => {
    const riskElement = document.getElementById('riskLevel');
    riskElement.textContent = riskLevel;
    riskElement.className = `risk-${riskLevel.toLowerCase()}`;
    document.getElementById('sustainabilityPeriod').textContent = sustainabilityPeriod;
};

// 현금 흐름 예측
const predictCashFlow = (days) => {
    let cashFlow = {
        inflow: 0,
        outflow: 0,
        balance: 0
    };

    levelData.forEach(level => {
        const dailyRecruitment = Math.floor(CONFIG.RECRUITMENT_RATE.DAILY * 
            Math.pow(CONFIG.RETENTION_RATE, level.level - 1));
        const newMembers = dailyRecruitment * days;
        
        // 수입 계산
        cashFlow.inflow += newMembers * level.joinFee;
        
        // 지출 계산 (보너스 + 수당)
        const totalBonuses = newMembers * level.joinFee * (
            (level.level > 1 ? CONFIG.SPONSOR_BONUS_RATE : 0) +
            (level.level > 1 ? CONFIG.REFERRAL_BONUS_RATE : 0) +
            (level.level > 1 ? CONFIG.RANK_BONUS_RATE : 0) +
            (CONFIG.DAILY_BONUS_RATE * days)
        );
        
        cashFlow.outflow += totalBonuses;
    });

    cashFlow.balance = cashFlow.inflow - cashFlow.outflow;
    return cashFlow;
};

// 경고 메시지 표시
const showWarning = (message) => {
    const warningDiv = document.getElementById('warningMessage');
    warningDiv.textContent = message;
    warningDiv.style.display = 'block';
};

const checkValue = (value) => {
    const threshold = 10; // 예: 특정 배수 기준 설정
    if (value > threshold) {
        showWarning(`경고: 값이 ${threshold}를 초과했습니다. 현재 값: ${value}`);
    }
};

// 재가입 필요성 체크
const checkRequalificationNeeds = () => {
    levelData.forEach(level => {
        const totalEarnings = calculateTotalEarnings(level);
        if (totalEarnings >= level.joinFee * CONFIG.QUALIFICATION_MULTIPLIER) {
            showWarning(`레벨 ${level.level} 회원들의 재가입이 필요합니다. 
                        총 수익이 가입금액의 ${CONFIG.QUALIFICATION_MULTIPLIER}배를 초과했습니다.`);
        }
    });
};

// 레벨별 총 수익 계산
const calculateTotalEarnings = (level) => {
    const levelSales = level.currentMembers * level.joinFee;
    return (level.level > 1 ? levelSales * (CONFIG.SPONSOR_BONUS_RATE + 
           CONFIG.REFERRAL_BONUS_RATE + CONFIG.RANK_BONUS_RATE) : 0) +
           (levelSales * CONFIG.DAILY_BONUS_RATE * CONFIG.LEVEL_DURATION);
};

// 최적 회원 모집 속도 계산
const calculateOptimalRecruitmentRate = () => {
    const cashFlow30Days = predictCashFlow(30);
    const profitMargin = cashFlow30Days.balance / cashFlow30Days.inflow;
    
    let optimalDailyRate;
    if (profitMargin < 0.2) {
        optimalDailyRate = Math.floor(CONFIG.RECRUITMENT_RATE.DAILY * 0.6);
    } else if (profitMargin < 0.4) {
        optimalDailyRate = Math.floor(CONFIG.RECRUITMENT_RATE.DAILY * 0.8);
    } else {
        optimalDailyRate = CONFIG.RECRUITMENT_RATE.DAILY;
    }
    
    return {
        daily: optimalDailyRate,
        weekly: optimalDailyRate * 5
    };
};



// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initialize);

// 주기적인 리스크 체크 (5초마다)
setInterval(() => {
    if (document.visibilityState === 'visible') {
        checkRequalificationNeeds();
    }
}, 5000);
