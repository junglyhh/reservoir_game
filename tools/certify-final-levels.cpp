#include <algorithm>
#include <array>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;
using State=array<uint32_t,7>;
struct Key {State a; uint8_t last; bool operator==(const Key&o)const{return last==o.last&&a==o.a;}};
struct Hash {size_t operator()(const Key&k)const{uint64_t h=0x9e3779b97f4a7c15ull+k.last;for(auto x:k.a){h^=x+0x9e3779b97f4a7c15ull+(h<<6)+(h>>2);}return h;}};
int n,m,T,goals[7],d[7][7],caps[24][80][7],need[80],mass[80],nobj;
uint32_t scale;
vector<pair<int,int>> edges;vector<int> targets,path,answer;
unordered_map<Key,uint8_t,Hash> seen;
uint64_t visits=0,bounds=0,hits=0,byrem[24]={0};bool timedout=false;
chrono::steady_clock::time_point deadline,start;
bool possible(const State&s,int rem){
 array<int,7>ord;for(int i=0;i<n;i++)ord[i]=i;
 sort(ord.begin(),ord.begin()+n,[&](int a,int b){return s[a]>s[b];});
 for(int mask=0;mask<nobj;mask++){
  int available=mass[mask];uint64_t top=0;
  for(int k=0;k<n&&available;k++){int v=ord[k],take=min(available,caps[rem][mask][v]);top+=uint64_t(take)*s[v];available-=take;}
  if(top<uint64_t(need[mask])*scale*420)return false;
 }
 return true;
}
bool dfs(State&s,int rem,int last){
 visits++;byrem[rem]++;
 if((visits&262143)==0&&chrono::steady_clock::now()>deadline){timedout=true;return false;}
 int unmet=0;for(int v:targets)if(s[v]<uint32_t(goals[v])*scale)unmet++;
 if(!unmet){answer=path;return true;}
 // Averaging cannot newly satisfy both endpoints: the previously larger,
 // still-deficient endpoint cannot increase. Thus every unmet goal costs
 // at least one additional move, even if one pipe touches two goals.
 if(unmet>rem)return false;
 if(!rem||timedout)return false;
 if(rem==1){
  int deficient=0;for(int v:targets)if(s[v]<uint32_t(goals[v])*scale)deficient|=1<<v;
  for(int e=0;e<m;e++){
   auto [a,b]=edges[e];if(deficient&~((1<<a)|(1<<b)))continue;
   uint32_t avg=(s[a]+s[b])/2;bool ok=true;
   for(int v:targets)if((v==a||v==b?avg:s[v])<uint32_t(goals[v])*scale)ok=false;
   if(ok){answer=path;answer.push_back(e);return true;}
  }
  return false;
 }
 const bool closing=(unmet==rem);
 if(!closing&&!possible(s,rem)){bounds++;return false;}
 if(rem>=5&&seen.size()<6000000){Key key{s,uint8_t(last+1)};auto it=seen.find(key);if(it!=seen.end()&&it->second>=rem){hits++;return false;}seen[key]=rem;}
 for(int e=0;e<m;e++){
  auto [a,b]=edges[e];if(s[a]==s[b])continue;
  if(last>=0&&e<last){auto [c,f]=edges[last];if(a!=c&&a!=f&&b!=c&&b!=f)continue;}
  uint32_t av=s[a],bv=s[b];uint32_t avg=(av+bv)/2;
  if(closing){int after=0;for(int v:targets)if((v==a||v==b?avg:s[v])<uint32_t(goals[v])*scale)after++;if(after>=unmet)continue;}
  s[a]=s[b]=avg;
  path.push_back(e);bool result=dfs(s,rem-1,e);path.pop_back();s[a]=av;s[b]=bv;
  if(result)return true;
  if(timedout)return false;
 }
 return false;
}
int main(int argc,char**argv){
 int id=stoi(argv[1]);T=stoi(argv[2]);int secs=argc>3?stoi(argv[3]):120;
 n=id==9?6:7;edges={{0,1},{0,2},{1,3},{2,5}};
 if(id==10){edges.push_back({1,6});edges.push_back({2,6});edges.push_back({6,4});}
 edges.push_back({3,4});edges.push_back({5,4});m=edges.size();
 goals[3]=19;goals[4]=id==9?15:18;goals[5]=id==9?17:18;targets={3,4,5};
 for(int i=0;i<n;i++)for(int j=0;j<n;j++)d[i][j]=i==j?0:100;
 for(auto [a,b]:edges)d[a][b]=d[b][a]=1;
 for(int k=0;k<n;k++)for(int i=0;i<n;i++)for(int j=0;j<n;j++)d[i][j]=min(d[i][j],d[i][k]+d[k][j]);
 vector<array<int,3>> objectives={{1,1,1},{1,0,1},{1,1,0},{0,1,1},{1,0,0},{0,1,0},{0,0,1}};
 for(auto obj:vector<array<int,3>>{{1,2,1},{2,1,1},{1,1,2},{2,2,1},{1,2,2},{2,1,2},{1,4,1},{4,1,1},{1,1,4},{2,4,1},{1,4,2},{4,2,1},{4,1,2},{2,1,4},{1,2,4},{1,2,0},{0,2,1},{2,1,0},{0,1,2},{2,0,1},{1,0,2}})objectives.push_back(obj);
 nobj=objectives.size();
 for(int mask=0;mask<nobj;mask++){
  auto obj=objectives[mask];int maxc=*max_element(obj.begin(),obj.end());
  for(int g=0;g<3;g++){need[mask]+=obj[g]*goals[targets[g]];mass[mask]+=obj[g]*420;}
  for(int r=0;r<=T;r++)for(int v=0;v<n;v++){
   int cap=0;for(int g=0;g<3;g++)if(d[targets[g]][v]<=r)cap+=obj[g]*420/(d[targets[g]][v]+1);
   caps[r][mask][v]=min(420*maxc,cap);
  }
 }
 scale=1u<<T;State s{};s[0]=100*scale;seen.reserve(1000000);
 start=chrono::steady_clock::now();deadline=start+chrono::seconds(secs);bool found=dfs(s,T,-1);
 double seconds=chrono::duration<double>(chrono::steady_clock::now()-start).count();
 cout<<"{\"id\":"<<id<<",\"horizon\":"<<T<<",\"found\":"<<(found?"true":"false")<<",\"timedout\":"<<(timedout?"true":"false")<<",\"visits\":"<<visits<<",\"bounds\":"<<bounds<<",\"cache_hits\":"<<hits<<",\"cache_size\":"<<seen.size()<<",\"seconds\":"<<seconds<<",\"solution\":[";
 for(int i=0;i<answer.size();i++){if(i)cout<<",";cout<<answer[i];}cout<<"],\"depth_counts\":[";for(int r=0;r<=T;r++){if(r)cout<<",";cout<<byrem[r];}cout<<"]}"<<endl;
}
