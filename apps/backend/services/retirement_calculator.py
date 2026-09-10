"""Nominal SGD monthly cash flows, mirrored in packages/shared/src/retirement.ts."""
from datetime import date
from math import ceil, floor
from schemas.retirement import RetirementPlan

VERSION = 'sg-monthly.v2'


def month_index(value):
    """Use calendar months, avoiding day lengths and timezone arithmetic."""
    year, month = map(int, str(value)[:7].split('-'))
    return year * 12 + month - 1


def calendar_month(value):
    return f'{value // 12:04d}-{value % 12 + 1:02d}'


def cash(value):
    """Round only at the contract boundary, matching JavaScript half-up rounding."""
    return f'{floor((value + 2.220446049250313e-16) * 100 + 0.5) / 100:.2f}'


def validate_timeline(plan, as_of):
    """Reject stale targets and future portfolio evidence at calculation time."""
    now, birth, retirement = map(month_index, [as_of, plan['birthMonth'], plan['retirementMonth']])
    end = birth + plan['endAge'] * 12
    if plan['spendingMonth'] > str(as_of)[:7]:
        raise ValueError('Spending value month cannot be in the future.')
    if birth >= now or retirement < now or retirement >= end or end - now > 1440:
        raise ValueError('Retirement must be this month or later and before the planning end age.')
    if plan['portfolioOverride'] and plan['portfolioOverride']['date'] > str(as_of):
        raise ValueError('Portfolio date cannot be in the future.')


def calculate_retirement(plan, assets, effective_date):
    """Backward requirements and forward verification share the exact monthly schedule."""
    result = dict(calculationVersion=VERSION, effectiveDate=str(effective_date), plan=plan,
                  status='insufficient_data', fundingStatus='review_required',
                  currentInvestableAssets=None if assets is None else cash(float(assets)),
                  fiTarget=None, progressRate=None, progressRateCapped=None, estimatedMonths=None,
                  estimatedFiYear=None, earliestRetirementMonth=None, requiredMonthlyInvestment=None,
                  projectedPortfolio=None, fundingGap=None, targetToday=None, portfolioToday=None,
                  assumptions=None, spendingBaseline=dict(status='insufficient_data', source='none', startDate=None,
                  endDate=None, completedMonths=0, expenseTotal=None, annualisedSpending=None),
                  actualPath=[], projectedPath=[], monthlyCashFlows=[], warnings=[])
    def warn(code, message):
        result['warnings'].append(dict(code=code, message=message))
    if not plan:
        warn('review_required', 'Review required: confirm the five setup steps to activate a retirement plan.')
        return result
    try:
        plan = RetirementPlan.model_validate(plan).model_dump(mode='json')
        validate_timeline(plan, effective_date)
    except ValueError as error:
        warn('invalid_plan', str(error))
        return result
    starting = plan['portfolioOverride']['amount'] if plan['portfolioOverride'] else assets
    if starting is None:
        warn('missing_portfolio', 'Confirm eligible asset snapshots or a dated planning-only total.')
        return result
    starting = float(starting)
    result['currentInvestableAssets'] = cash(starting)
    now, birth, retirement = map(month_index, [effective_date, plan['birthMonth'], plan['retirementMonth']])
    end, cpf_start = birth + plan['endAge'] * 12, birth + plan['cpfStartAge'] * 12
    before, after, inflation = [(1 + plan[key]) ** (1 / 12) for key in ['beforeReturn', 'afterReturn', 'inflation']]
    schedule = []
    for offset in range(end - now):
        index = now + offset
        cpf = 0
        if index >= cpf_start and plan['cpfPlan'] in ['standard', 'escalating']:
            cpf = plan['cpfMonthlyPayout'] * (1.02 ** ((index - cpf_start) // 12) if plan['cpfPlan'] == 'escalating' else 1)
        other = sum(i['monthlyAmount'] * (1 + i['annualGrowth']) ** ((index - month_index(i['startMonth'])) / 12)
                    for i in plan['otherIncome'] if month_index(i['startMonth']) <= index < month_index(i['endMonth']))
        schedule.append(dict(month=calendar_month(index), expenses=plan['monthlySpending'] * inflation ** (index - month_index(plan['spendingMonth']) + 1), cpf=cpf, other=other))
    targets = [0.0] * (len(schedule) + 1)
    for i in range(len(schedule) - 1, -1, -1):
        row = schedule[i]
        targets[i] = max(0, (targets[i + 1] + row['expenses'] - row['cpf'] - row['other']) / after)
    n = retirement - now
    target, accumulated, factor, earliest = targets[n], starting, 0, None
    for i in range(len(schedule)):
        if earliest is None and accumulated + 1e-7 >= targets[i]:
            earliest = i
        if i < n:
            factor = factor * before + 1
        accumulated = accumulated * before + plan['monthlyContribution']
    portfolio = starting * before ** n + plan['monthlyContribution'] * factor
    required = (0 if starting + 1e-7 >= target else None) if n == 0 else max(0, (target - starting * before ** n) / factor)
    balance, verification = starting, target
    for i, row in enumerate(schedule):
        retired = i >= n
        growth = balance * ((after if retired else before) - 1)
        contribution = 0 if retired else plan['monthlyContribution']
        expenses, cpf, other = (row['expenses'], row['cpf'], row['other']) if retired else (0, 0, 0)
        balance += growth + contribution + cpf + other - expenses
        if retired:
            verification = verification * after + cpf + other - expenses
            if verification < -0.01:
                raise ArithmeticError('Retirement target failed forward verification')
        result['monthlyCashFlows'].append(dict(month=row['month'], phase='retirement' if retired else 'accumulation',
            growth=cash(growth), contribution=cash(contribution), expenses=cash(expenses), cpf=cash(cpf), otherIncome=cash(other), balance=cash(balance)))
        if i == 0 or i == n or i % 12 == 0 or i == len(schedule) - 1:
            result['projectedPath'].append(dict(date=row['month'] + '-01', amount=cash(balance), kind='projected'))
    result.update(status='already_reached' if earliest == 0 else 'unreachable' if earliest is None else 'projected',
        fundingStatus='funded' if portfolio + 1e-7 >= target else 'shortfall', fiTarget=cash(target),
        projectedPortfolio=cash(portfolio), fundingGap=cash(max(0, target - portfolio)), targetToday=cash(target / inflation ** n),
        portfolioToday=cash(portfolio / inflation ** n), progressRate=f'{portfolio / target if target else 1:.6f}',
        progressRateCapped=f'{min(1, portfolio / target) if target else 1:.6f}',
        requiredMonthlyInvestment=None if required is None else cash(ceil(required * 100) / 100), estimatedMonths=earliest,
        earliestRetirementMonth=None if earliest is None else calendar_month(now + earliest),
        estimatedFiYear=None if earliest is None else (now + earliest) // 12)
    warn('smooth_returns', 'Smooth returns do not capture market sequence risk or guarantee funding beyond the selected end age. Negative balances show unfunded cash flows, not available borrowing.')
    warn('excluded_assets', 'CPF, SRS and other restricted resources, property and designated emergency reserves are excluded, regardless of legacy FI flags. CPF principal is never counted alongside payouts.')
    if plan['cpfPlan'] in ['unknown', 'basic']:
        warn('cpf_not_included', 'CPF income not included: Basic declining payouts are not modelled.' if plan['cpfPlan'] == 'basic' else 'CPF income not included: payout is not yet known.')
    if plan['portfolioOverride'] and (date.fromisoformat(str(effective_date)) - date.fromisoformat(plan['portfolioOverride']['date'])).days > 35:
        warn('stale_snapshot', 'The planning-only portfolio total is older than 35 days; it is not automatically grown to today.')
    return result
