"""Assemble production level data without exposing validation solutions."""
from pathlib import Path
import importlib.util,json,subprocess

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('campaign',ROOT/'tools/expand-campaign.py')
campaign=importlib.util.module_from_spec(spec);spec.loader.exec_module(campaign)
validation=ROOT/'validation'
old_zh_path=validation/'original-ten-translations.json'
if not old_zh_path.exists():
    code="import {levelTranslations} from './docs/i18n-levels.js'; console.log(JSON.stringify(levelTranslations.zh));"
    output=subprocess.run(['node','--input-type=module','-e',code],cwd=ROOT,text=True,capture_output=True,check=True)
    old_zh_path.write_text(output.stdout)
old_zh=json.loads(old_zh_path.read_text())
old_search=json.loads((validation/'original-level-search.json').read_text())
new_search=json.loads((validation/'new-level-search.json').read_text())
final_search=json.loads((validation/'proofs/original-final-certificates.json').read_text())['levels']

concepts={
1:([
 'A connection balances the amounts at its two ends.',
 'A flower only needs to reach its target line; extra light is welcome.'
],[
 '一条连线，会让两端水池的光量变得相同。',
 '花朵只需要达到目标线；多一些光也没有关系。'
]),
2:([
 'Light moves only between connected neighbors.',
 'A junction can hold light before it travels farther.'
],[
 '光只能在直接相连的邻居之间传递。',
 '中转点可以先储存光，再让光走向远方。'
]),
3:([
 'A connection can be used more than once.',
 'A flower may need several small deliveries to reach its threshold.'
],[
 '同一条连线可以多次使用。',
 '一朵花可能需要几次小小的补充，才能达到目标下限。'
]),
4:([
 'Both flowers must reach their minimums at the same time.',
 'The shared junction can hold a reserve for more than one branch.'
],[
 '两朵花必须同时达到或超过各自的目标下限。',
 '共用的中转点，可以为不同支路储备光量。'
]),
5:([
 'The distant flower needs light to pass through a relay.',
 'A flower that already has enough light may need protection from later sharing.'
],[
 '远处的花，需要通过中转点接力传光。',
 '已经拥有足够光量的花，可能需要避免在之后的分享中失去太多。'
]),
6:([
 'The bridge between junctions can redirect a reserve.',
 'The two flowers have different thresholds; their routes need not be treated alike.'
],[
 '中转点之间的连线，可以改变储备光量的去向。',
 '两朵花的最低需求不同，不必用同样的方式照顾两条路线。'
]),
7:([
 'A final relay is more useful when it already holds a generous reserve.',
 'Preparing one branch changes what remains available for the other.'
],[
 '最后一站的中转点，蓄好光后会更有用。',
 '为一条支路做准备，也会改变另一条支路可用的光量。'
]),
8:([
 'Three different thresholds reward a deliberate allocation.',
 'A late branch can still draw on reserves left upstream.'
],[
 '三种不同的最低需求，需要有意识地分配光量。',
 '最后照顾的支路，仍可以利用上游留下的储备。'
]),
9:([
 'A flower can pass some of its surplus to a neighboring flower.',
 'Both sides of the ring can contribute to the remaining targets.'
],[
 '花朵可以把一部分富余的光分享给相邻的花。',
 '圆环的两侧，都可以为尚未达标的目标提供光量。'
]),
10:([
 'Extra connections are options; you do not need to use every pipe.',
 'The whole distribution matters more than any single full vessel.'
],[
 '更多连线意味着更多选择，但不必用到每一条。',
 '整座花园的光量分布，比单个水池是否充盈更加重要。'
])
}

certificates={}
levels=[];translated={}
for original in campaign.original:
    data=json.loads(json.dumps(original))
    id=data['id'];solution=data.pop('solution')
    if str(id) in old_search:
        result=old_search[str(id)]
        solution=result['solution'];par=result['optimalMoves'];verified=True
        proof=dict(method='exact dyadic iterative-deepening search',excludedThrough=par-1,visited=result['visited'],solver='tools/solve-levels.cpp',stateDenominator=2**24)
    elif str(id) in final_search:
        result=final_search[str(id)]
        solution=result['solution'];par=result['optimalMoves'];verified=result['optimalVerified']
        proof=result['proof']
    else:
        raise ValueError('Missing original-level certificate: '+str(id))
    data['par']=par;data['parVerified']=verified
    if data['difficulty']=='Master':data['budget']=par
    elif id!=1:data['budget']=max(data['budget'],par+2)
    en,zh=concepts[id]
    data['hint']=en[0];data['hints']=en
    translation=old_zh[str(id)]
    translation['hint']=zh[0];translation['hints']=zh
    translated[str(id)]=translation
    certificates[str(id)]=dict(solution=solution,optimalMoves=par,optimalVerified=verified,proof=proof)
    if str(id) in final_search:
        certificates[str(id)]['exactFinalPercentages']=final_search[str(id)]['exactFinalPercentages']
    levels.append(data)

for data in campaign.new:
    id=data['id'];result=new_search[str(id)]
    assert result['optimalVerified'],id
    par=result['optimalMoves'];data['par']=par;data['parVerified']=True
    data['budget']=par+({'Medium':3,'Hard':4,'Master':0}[data['difficulty']])
    certificates[str(id)]=dict(solution=result['solution'],optimalMoves=par,optimalVerified=True,proof=dict(method='exact dyadic iterative-deepening search',excludedThrough=par-1,visited=result['visited'],solver='tools/solve-levels.cpp',stateDenominator=2**24))
    translated[str(id)]=campaign.translations[id]
    levels.append(data)

rank={'Easy':0,'Medium':1,'Hard':2,'Master':3}
levels.sort(key=lambda l:(rank[l['difficulty']],l['par'],l['id']))
assert len(levels)==30 and len({l['id'] for l in levels})==30
assert all(1<=sum('goal' in n for n in l['nodes'])<=3 for l in levels)
(ROOT/'docs/levels.json').write_text(json.dumps(levels,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/i18n-levels.js').write_text('// Narrative translations are keyed by stable level IDs, not campaign order.\nexport const levelTranslations = '+json.dumps({'zh':translated},ensure_ascii=False,indent=2)+';\n')
(validation/'level-solutions.json').write_text(json.dumps({'schemaVersion':1,'levels':certificates},ensure_ascii=False,indent=2)+'\n')
catalog=[]
for number,data in enumerate(levels,1):
    catalog.append(dict(number=number,id=data['id'],name=data['name'],chinese=translated[str(data['id'])]['name'],difficulty=data['difficulty'],blooms=sum('goal'in n for n in data['nodes']),vertices=len(data['nodes']),edges=len(data['edges']),topology=data.get('topology','original garden'),par=data['par'],budget=data['budget'],optimalVerified=data['parVerified']))
(validation/'campaign-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(catalog,ensure_ascii=False,indent=2))
