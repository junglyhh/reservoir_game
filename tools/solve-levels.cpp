#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <limits>
#include <numeric>
#include <unordered_map>
#include <vector>

// Exact dyadic search for the local validation certificates. No solver data is
// included in docs/ or in the standalone game. Inputs use thousandths of a
// percent; a 2^24 denominator represents every state through depth 24 exactly.
constexpr uint32_t MASS = 1u << 24;
constexpr uint64_t LCM = 840;
struct State { std::array<uint32_t,8> w{}; bool operator==(const State& b)const{return w==b.w;} };
struct Hash { size_t operator()(const State& s)const{uint64_t h=1469598103934665603ull;for(auto w:s.w){h^=w;h*=1099511628211ull;}return h;} };
int n,m,root,maxDepth,timeLimit;
std::vector<std::pair<int,int>> edges;
std::vector<std::pair<int,int>> goals;
int dista[8][8];
std::unordered_map<State,uint8_t,Hash> seen;
std::vector<int> path,answer;
uint64_t visits=0, totalVisits=0;
bool aborted=false;
std::chrono::steady_clock::time_point started;

bool done(const State& s){for(auto [v,g]:goals)if(uint64_t(s.w[v])*100000<uint64_t(g)*MASS)return false;return true;}
bool viable(const State& s,int remain){
 int unmet=0;
 for(auto [v,g]:goals){
  if(uint64_t(s.w[v])*100000>=uint64_t(g)*MASS)continue;
  ++unmet;
  uint64_t upper=0;
  for(int j=0;j<n;++j)if(dista[j][v]<=remain)upper+=uint64_t(s.w[j])*(LCM/(dista[j][v]+1));
  if(upper*100000<uint64_t(g)*MASS*LCM)return false;
 }
 return unmet<=remain;
}
bool dfs(const State& s,int remain){
 ++visits;
 if((visits&65535)==0){
  if(std::chrono::duration<double>(std::chrono::steady_clock::now()-started).count()>timeLimit || seen.size()>3500000){aborted=true;return false;}
 }
 if(done(s)){answer=path;return true;}
 if(remain==0||!viable(s,remain))return false;
 auto it=seen.find(s);if(it!=seen.end()&&it->second>=remain)return false;
 seen[s]=remain;
 struct Candidate{int edge;double score;};
 std::vector<Candidate> candidates;
 for(int i=0;i<m;++i){
  auto [a,b]=edges[i];if(s.w[a]==s.w[b])continue;
  double score=0;
  for(auto [v,g]:goals){
   double urgency=std::max(.1,double(g)/100000-double(s.w[v])/MASS);
   score+=urgency*(double(s.w[a])-s.w[b])*(1.0/(dista[b][v]+1)-1.0/(dista[a][v]+1));
  }
  candidates.push_back({i,score});
 }
 std::stable_sort(candidates.begin(),candidates.end(),[](auto a,auto b){return a.score>b.score;});
 for(auto c:candidates){
  auto [a,b]=edges[c.edge];State next=s;next.w[a]=next.w[b]=(s.w[a]+s.w[b])/2;
  path.push_back(c.edge);if(dfs(next,remain-1))return true;path.pop_back();
  if(aborted)return false;
 }
 return false;
}
int main(){
 int gcount;std::cin>>n>>m>>root>>gcount>>maxDepth>>timeLimit;
 if(n>8||maxDepth>24||n<2)return 2;
 for(int i=0;i<m;++i){int a,b;std::cin>>a>>b;edges.push_back({a,b});}
 for(int i=0;i<gcount;++i){int v,g;std::cin>>v>>g;goals.push_back({v,g});}
 for(int i=0;i<n;++i)for(int j=0;j<n;++j)dista[i][j]=(i==j?0:99);
 for(auto [a,b]:edges)dista[a][b]=dista[b][a]=1;
 for(int k=0;k<n;++k)for(int i=0;i<n;++i)for(int j=0;j<n;++j)dista[i][j]=std::min(dista[i][j],dista[i][k]+dista[k][j]);
 State initial;initial.w[root]=MASS;
 int lower=0;for(auto [v,g]:goals)lower=std::max(lower,dista[root][v]);
 started=std::chrono::steady_clock::now();
 int proved=lower-1;
 for(int depth=lower;depth<=maxDepth;++depth){
  seen.clear();path.clear();visits=0;
  bool found=dfs(initial,depth);totalVisits+=visits;
  if(found){
   std::cout<<"{\"optimalVerified\":true,\"optimalMoves\":"<<answer.size()<<",\"provedThrough\":"<<proved<<",\"visited\":"<<totalVisits<<",\"solution\":[";
   for(size_t i=0;i<answer.size();++i){if(i)std::cout<<",";std::cout<<answer[i];}
   std::cout<<"]}"<<std::endl;return 0;
  }
  if(aborted){std::cout<<"{\"optimalVerified\":false,\"provedThrough\":"<<proved<<",\"visited\":"<<totalVisits<<",\"abortedDepth\":"<<depth<<"}"<<std::endl;return 0;}
  proved=depth;
 }
 std::cout<<"{\"optimalVerified\":false,\"provedThrough\":"<<proved<<",\"visited\":"<<totalVisits<<",\"noSolutionWithinLimit\":true}"<<std::endl;
}
