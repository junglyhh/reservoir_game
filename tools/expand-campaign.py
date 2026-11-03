"""Author and certify the 30-level local campaign (validation data stays private)."""
from pathlib import Path
import json, subprocess, sys, time

ROOT=Path(__file__).resolve().parents[1]
SOLVER=ROOT.parent/'solve-garden-levels'
OUT=ROOT/'validation'
OUT.mkdir(exist_ok=True)
original_path=OUT/'original-ten-levels.json'
if not original_path.exists():
    original_path.write_text((ROOT/'docs/levels.json').read_text())
original=json.loads(original_path.read_text())

diamond=[(13,50),(46,18),(46,76),(87,50)]
triangle_tail=[(13,50),(41,18),(41,76),(86,76)]
square=[(15,20),(84,20),(84,76),(15,76)]
star=[(13,50),(42,50),(82,15),(88,50),(79,81)]
fan=[(48,50),(14,18),(85,18),(84,77)]
diamond_tail=[(12,50),(38,18),(38,76),(64,50),(89,50)]
bridge=[(13,20),(13,77),(39,50),(64,50),(88,20),(88,77)]
bowtie=[(50,50),(13,18),(13,77),(87,18),(87,77)]
zigzag=[(13,18),(38,76),(63,18),(87,76)]
pentagon=[(13,50),(39,14),(83,27),(83,76),(39,84)]
stem_ring=[(12,50),(36,50),(64,17),(88,50),(64,79)]
ladder=[(13,18),(50,18),(87,18),(13,76),(50,76),(87,76)]
hexagon=[(13,50),(36,18),(36,77),(67,18),(88,50),(67,77)]
double_fork=[(13,50),(36,50),(60,18),(60,77),(88,18),(88,77)]
two_hubs=[(13,18),(13,77),(39,50),(64,50),(88,18),(88,77)]
chain_triangles=[(13,50),(37,18),(37,77),(63,50),(88,18),(88,77)]
long_path=[(12,15),(31,77),(50,15),(69,77),(88,15)]
bull=[(14,18),(31,41),(69,41),(50,77),(86,18)]

def level(id,name,zhname,difficulty,topology,coords,edges,goals,labels,subtitle,zhsubtitle,hints,zhhints,discovery,zhdiscovery):
    chapter={'Medium':'New paths','Hard':'Deeper waters','Master':'The final garden'}[difficulty]
    zhchapter={'Medium':'新径初探','Hard':'深水寻光','Master':'终章花园'}[difficulty]
    nodes=[dict(id=label.lower(),x=x,y=y,label=label,**({'goal':goals[i]} if i in goals else {})) for i,((x,y),label) in enumerate(zip(coords,labels))]
    return dict(id=id,name=name,chapter=chapter,difficulty=difficulty,subtitle=subtitle,root=0,nodes=nodes,edges=edges,hint=hints[0],hints=hints,discovery=discovery,topology=topology),dict(name=zhname,chapter=zhchapter,subtitle=zhsubtitle,hint=zhhints[0],hints=zhhints,discovery=zhdiscovery)

specs=[
 (11,'Two ways home','双径归光','Medium','diamond',diamond,[(0,1),(0,2),(1,3),(2,3)],{3:29},['R','H','J','A'],'Two routes lead to one patient flower.','两条小径，通往同一朵等待的花。',['A second route is an option, not an obligation.','A junction can gather light again after it shares.'],['多一条路线，意味着多一种选择，不必全部使用。','中转点分享光量后，仍然可以再次蓄光。'],'A short route may reward repeated sharing.','一条短路，也可能需要多次传光。'),
 (12,'A quiet detour','静谧岔道','Medium','triangle with tail',triangle_tail,[(0,1),(0,2),(1,2),(2,3)],{3:30},['R','H','J','A'],'Choose where your light is most useful.','想一想，光留在哪里最有用。',['An extra corner can hold light you might need elsewhere.','Compare each junction’s reserve before using a detour.'],['额外的角落也会留住光，而别处可能更需要它。','走岔路之前，先比较各个中转点的储备。'],'Every detour changes where the reserve is stored.','每次绕行，都会改变光量储备的位置。'),
 (13,'Corner to corner','转角花语','Medium','square cycle',square,[(0,1),(1,2),(2,3),(3,0)],{2:30,3:22},['R','H','A','B'],'The square has more than one rhythm.','方形花园，藏着不同的传光节奏。',['A flower can share light as well as receive it.','The larger threshold deserves some extra room.'],['花朵既能接收光，也能把光分享出去。','最低需求较高的花，需要留出更多余量。'],'A target can become a stepping stone.','目标花朵，也可以成为传光的落脚点。'),
 (14,'Three little lanterns','三盏微灯','Medium','three-leaf fountain',star,[(0,1),(1,2),(1,3),(1,4)],{2:20,3:16,4:12},['R','H','A','B','C'],'Three different wishes meet at one fountain.','三种不同的心愿，汇聚在同一座泉心。',['The flowers need different amounts of light.','A shared junction can be replenished between branches.'],['三朵花所需的光量并不相同。','共用的中转点，可以在照顾支路的间隙补充光量。'],'Unequal needs can make the order matter.','需求不同，先后顺序就会产生影响。'),
 (15,'Open hands','舒展枝叶','Medium','rooted three-arm star',fan,[(0,1),(0,2),(0,3)],{1:30,2:20,3:15},['R','A','B','C'],'Share generously, but keep a little in reserve.','慷慨分享，也别忘了保留一点光。',['Every gift also changes the source.','The source can receive light back from a fuller flower.'],['每次分享，也会改变源点自己的光量。','光量较多的花，也能把光回送给源点。'],'Sharing works in both directions.','分享可以双向进行。'),
 (16,'Beyond the diamond','菱光彼岸','Medium','diamond with terminal tail',diamond_tail,[(0,1),(0,2),(1,3),(2,3),(3,4)],{3:20,4:18},['R','H','J','A','B'],'A distant flower waits beyond the meeting point.','两路交汇之后，还有一朵花在等待。',['Both paths meet at a flower that also carries light onward.','Sending light farther can lower a target you already reached.'],['两条路线汇于一朵花，它还要继续向远处传光。','把光送向远方，可能让已经达标的花暂时回落。'],'A shared destination needs its own reserve.','承担接力的目标，也需要自己的储备。'),
 (17,'The garden bridge','花园小桥','Medium','two triangles joined by a bridge',bridge,[(0,1),(0,2),(1,2),(2,3),(3,4),(3,5),(4,5)],{4:12,5:12},['R','H','J','K','A','B'],'Carry enough light across the narrow crossing.','带着足够的光，走过狭窄的小桥。',['Only one connection carries light between the two sides.','Light left on the starting side can still be useful later.'],['两片花园之间，只有一条连线相通。','留在出发一侧的光，之后仍可能派上用场。'],'A bridge makes preparation valuable.','桥梁越关键，准备就越重要。'),
 (18,'Petal wings','蝶翼花庭','Medium','two triangles sharing a center',bowtie,[(0,1),(1,2),(2,0),(0,3),(3,4),(4,0)],{2:27,3:18,4:26},['R','H','A','B','C'],'Two small loops open like a pair of wings.','两个小小的环，像蝶翼一样展开。',['Each wing has its own local route.','A central source must serve both sides of the garden.'],['每一侧蝶翼，都有自己的局部路线。','中央的源点，需要同时照顾两侧花园。'],'Local loops can share a common reserve.','不同的小环，可以共用一份储备。'),
 (19,'The winding stream','曲水流光','Medium','four-vertex winding path',zigzag,[(0,1),(1,2),(2,3)],{2:22,3:18},['R','H','A','B'],'The stream turns, and the light travels on.','溪流转弯，光仍继续前行。',['The near flower is also the final relay to the far one.','Refilling a relay may be more useful than an immediate delivery.'],['近处的花，也是通向远处花朵的最后一站。','有时，先补充中转点比立即送光更有用。'],'Passing a target is different from finishing there.','经过一朵花，与在它那里结束，并不相同。'),
 (20,'Five quiet corners','五角静庭','Medium','pentagonal cycle',pentagon,[(0,1),(1,2),(2,3),(3,4),(4,0)],{2:24,3:15},['R','H','A','B','J'],'Find a route around the five-cornered pond.','沿着五角池塘，寻找合适的传光路线。',['The two directions around the pond have different lengths.','Nearby flowers can help one another once they hold a reserve.'],['绕池塘的两个方向，路程并不一样。','相邻的花蓄好光后，可以互相帮助。'],'Distance and remaining reserves both shape a route.','路程与剩余储备，一起影响路线的选择。'),
 (21,'A ring of promises','环上心愿','Hard','square cycle behind a stem',stem_ring,[(0,1),(1,2),(2,3),(3,4),(4,1)],{2:22,3:15,4:19},['R','H','A','B','C'],'One entrance, three promises to keep.','一处入口，三份等待实现的心愿。',['All fresh light must pass through the entrance junction.','The ring can redistribute light already inside it.'],['所有新增的光，都要经过入口的中转点。','圆环内部，也可以重新分配已有的光。'],'A loop can redistribute a limited supply.','小环也能重新安排有限的光量。'),
 (22,'The little ladder','拾光阶梯','Hard','two-row ladder',ladder,[(0,1),(1,2),(3,4),(4,5),(0,3),(1,4),(2,5)],{2:24,5:20},['R','H','A','J','K','B'],'Climb across the garden one connection at a time.','沿着连线，一步步穿过花园。',['Rungs offer alternatives to staying on one rail.','A shortcut is useful only when it carries enough light.'],['横档让你有机会换到另一条路线。','捷径只有带着足够的光时才真正有用。'],'More routes call for careful choices.','路线越多，越需要仔细选择。'),
 (23,'The hidden chord','弦间微光','Hard','hexagonal cycle with a junction chord',hexagon,[(0,1),(0,2),(1,3),(2,5),(3,4),(5,4),(1,2)],{3:17,4:14,5:16},['R','H','J','A','B','C'],'A quiet chord joins the two sides of the circle.','一条静静的弦，连接圆环两侧。',['The chord moves light between supply routes.','A flower with a surplus can support its neighbor.'],['圆环中的弦，可以把光转移到另一条供给路线。','拥有余量的花，可以帮助相邻的花。'],'A cross-connection can change the balance of a loop.','一条横向连线，足以改变圆环的平衡。'),
 (24,'Two distant shores','双岸遥光','Hard','fork with two long arms',double_fork,[(0,1),(1,2),(1,3),(2,4),(3,5)],{4:15,5:14},['R','H','J','K','A','B'],'Two faraway flowers share a single beginning.','两朵远处的花，共用同一个起点。',['Both branches draw on the same upstream reserve.','The last relay on a branch can be prepared before its delivery.'],['两条支路，都依靠上游同一份储备。','支路最后一个中转点，可以先蓄好光再传递。'],'A common source rewards planning across both branches.','共用源点，需要兼顾两条支路。'),
 (25,'Keep the hearth bright','守住暖光','Hard','triangular islands with a home-side bloom',bridge,[(0,1),(0,2),(1,2),(2,3),(3,4),(3,5),(4,5)],{1:17,4:14,5:13},['R','A','H','J','B','C'],'Light the far side without forgetting home.','照亮远处，也别忘了出发的地方。',['One flower stays on the source side of the bridge.','A local reserve may need protection while distant flowers grow.'],['有一朵花，留在桥梁靠近源点的一侧。','照顾远方的花时，也要留心本地的储备。'],'A long journey still needs a balanced starting place.','光走得再远，起点也需要保持平衡。'),
 (26,'The twin fountains','双泉花语','Hard','two connected branching hubs',two_hubs,[(0,2),(1,2),(2,3),(3,4),(3,5)],{1:20,4:13,5:13},['R','A','H','J','B','C'],'Two fountains serve three different corners.','两座泉心，照顾三处不同的角落。',['The nearer bloom competes with the bridge for the same reserve.','The two distant flowers can be planned as a pair.'],['近处的花与连接两泉的小桥，共用同一份储备。','远处的两朵花，可以放在一起考虑。'],'Shared junctions connect otherwise separate needs.','共用的中转点，让不同的需求彼此关联。'),
 (27,'Braided currents','交织溪流','Hard','diamond with an extra chord and two terminal arms',chain_triangles,[(0,1),(0,2),(1,2),(1,3),(2,3),(3,4),(3,5)],{4:17,5:16},['R','H','J','K','A','B'],'Several currents gather before the final fork.','几股溪流汇聚之后，迎来最后的岔路。',['The meeting point can receive light from either side.','More upstream connections do not mean every connection is needed.'],['汇流处，可以从两侧获得光量。','上游连线更多，并不意味着每一条都要使用。'],'A rich network still benefits from a focused plan.','丰富的网络，同样需要明确的计划。'),
 (31,'The horned garden','双角花庭','Master','bull graph',bull,[(0,1),(1,2),(2,3),(3,1),(2,4)],{3:24,4:19},['R','H','J','A','B'],'Between two horns, a triangle holds a hidden reserve.','双角之间，小小的三角藏着一份余光。',['A flower can lend some of its light and still remain above its target.','The triangle connects two routes. Think about where to keep a reserve for the distant flower.'],['花朵可以借出一部分光，同时仍然达到自己的目标。','三角形连接着两条路线。想一想，该把留给远处花朵的余光存在哪里。'],'A carefully kept surplus can bring two different paths into balance.','妥善保留的余光，能让两条不同的路线达到平衡。'),
 (29,'The last few drops','最后几滴','Master','precision branching fountain',[(13,50),(48,50),(86,18),(86,77)],[(0,1),(1,2),(1,3)],{2:25.5,3:25.5},['R','H','A','B'],'Give both flowers the last little share they need.','把最后需要的一点光，分给两朵花。',['The flower targets are slightly above a perfectly even four-way split.','Balance can be temporary; choose which reserves to protect.'],['花朵的目标，略高于四个水池均分后的光量。','平衡只是暂时的；想一想，哪些光量需要保留。'],'Precision can grow from many gentle exchanges.','多次温和的交换，也能积累出精妙的结果。'),
 (30,'The long dawn','长夜初晓','Master','five-vertex winding path',long_path,[(0,1),(1,2),(2,3),(3,4)],{4:17},['R','H','J','K','A'],'Carry a generous share to the end of the stream.','带着充足的光，走到溪流尽头。',['Each relay holds part of the source’s original light.','The farthest flower may need a reserve built across several junctions.'],['每个中转点，都保存着源点最初光量的一部分。','最远的花，可能需要多个中转点一起积蓄光量。'],'A distant goal can depend on the whole chain.','远方的目标，可能需要整条路线共同努力。'),
]

new=[];translations={}
for spec in specs:
    data,translation=level(*spec)
    new.append(data);translations[data['id']]=translation

def solve(data,max_depth=20,seconds=35):
    targets=[(i,int(round(node['goal']*1000))) for i,node in enumerate(data['nodes']) if 'goal' in node]
    text=f"{len(data['nodes'])} {len(data['edges'])} {data['root']} {len(targets)} {max_depth} {seconds}\n"
    text+='\n'.join(f'{a} {b}' for a,b in data['edges'])+'\n'
    text+='\n'.join(f'{a} {b}' for a,b in targets)+'\n'
    run=subprocess.run([str(SOLVER)],input=text,text=True,capture_output=True,timeout=seconds+15,check=True)
    return json.loads(run.stdout)

if __name__=='__main__':
    selected=set(map(int,sys.argv[1:])) if len(sys.argv)>1 else {data['id'] for data in new}
    result_path=OUT/'new-level-search.json'
    results=json.loads(result_path.read_text()) if result_path.exists() else {}
    for data in new:
        if data['id'] not in selected:continue
        began=time.time();result=solve(data)
        result['seconds']=round(time.time()-began,3)
        results[str(data['id'])]=result
        result_path.write_text(json.dumps(results,ensure_ascii=False,indent=2))
        print(data['id'],data['name'],result,flush=True)
    (OUT/'new-level-drafts.json').write_text(json.dumps(new,ensure_ascii=False,indent=2))
    (OUT/'new-level-translations.json').write_text(json.dumps(translations,ensure_ascii=False,indent=2))
