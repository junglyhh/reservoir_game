#include <array>
#include <chrono>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <numeric>
#include <unordered_set>
#include <vector>

// Independent exhaustive breadth-first reachability. No graph-distance bound,
// heuristic, goal pruning, or existing campaign solver is used.
// Scale 2^15 represents every state through 15 averaging moves exactly.
constexpr uint32_t MASS = 1u << 15;
using Weights = std::array<uint32_t, 5>;
const std::array<std::array<int, 2>, 5> EDGES{{{0,1},{1,2},{2,3},{3,1},{2,4}}};

uint64_t encode(const Weights& w) {
  return uint64_t(w[0]) | (uint64_t(w[1]) << 16) |
    (uint64_t(w[2]) << 32) | (uint64_t(w[3]) << 48);
}
Weights decode(uint64_t key) {
  Weights w{};
  uint32_t sum = 0;
  for (int i = 0; i < 4; ++i) { w[i] = (key >> (16*i)) & 65535; sum += w[i]; }
  w[4] = MASS - sum;
  return w;
}
bool won(const Weights& w) {
  return uint64_t(w[3])*100 >= uint64_t(24)*MASS &&
    uint64_t(w[4])*100 >= uint64_t(19)*MASS;
}

struct Result {
  int firstWin = -1;
  int excludedThrough = 0;
  uint64_t inspectedTransitions = 0;
  uint64_t uniqueStates = 0;
  std::vector<uint64_t> uniqueAtDepth;
  double seconds = 0;
  bool reachableStateSpaceExhausted = false;
};

Result search(int excludedEdge = -1) {
  const auto start = std::chrono::steady_clock::now();
  std::unordered_set<uint64_t> seen;
  seen.reserve(500000);
  std::vector<uint64_t> frontier{encode({MASS,0,0,0,0})};
  seen.insert(frontier[0]);
  Result result;
  result.uniqueAtDepth.push_back(1);
  for (int depth = 1; depth <= 15; ++depth) {
    std::vector<uint64_t> next;
    next.reserve(frontier.size()*2);
    for (uint64_t encoded : frontier) {
      const auto original = decode(encoded);
      for (int edge = 0; edge < 5; ++edge) {
        if (edge == excludedEdge) continue;
        const int a = EDGES[edge][0], b = EDGES[edge][1];
        if (original[a] == original[b]) continue;
        ++result.inspectedTransitions;
        if ((original[a] + original[b]) % 2) {
          std::cerr << "Inexact averaging at depth " << depth << '\n';
          std::exit(2);
        }
        auto w = original;
        w[a] = w[b] = (w[a] + w[b]) / 2;
        if (won(w)) {
          result.firstWin = depth;
          result.excludedThrough = depth-1;
          result.uniqueStates = seen.size();
          result.seconds = std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();
          return result;
        }
        // To rule out depth 15 we only need to inspect its candidate states;
        // no depth-16 expansion or storage of this final frontier is needed.
        if (depth < 15) {
          const auto code = encode(w);
          if (seen.insert(code).second) next.push_back(code);
        }
      }
    }
    result.excludedThrough = depth;
    if (depth < 15) result.uniqueAtDepth.push_back(next.size());
    frontier = std::move(next);
    if (frontier.empty() && depth < 15) {
      result.reachableStateSpaceExhausted = true;
      result.excludedThrough = 15;
      break;
    }
  }
  result.uniqueStates = seen.size();
  result.seconds = std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();
  return result;
}

void printResult(std::ostream& out, const Result& result) {
  out << "{\"firstWinningDepth\":";
  if (result.firstWin < 0) out << "null"; else out << result.firstWin;
  out << ",\"excludedThrough\":" << result.excludedThrough
      << ",\"reachableStateSpaceExhausted\":" << (result.reachableStateSpaceExhausted ? "true" : "false")
      << ",\"uniqueStatesStored\":" << result.uniqueStates
      << ",\"inspectedNontrivialTransitions\":" << result.inspectedTransitions
      << ",\"uniqueNewStatesAtDepth\":[";
  for (size_t i=0;i<result.uniqueAtDepth.size();++i) {
    if (i) out << ',';
    out << result.uniqueAtDepth[i];
  }
  out << "],\"seconds\":" << result.seconds << '}';
}

int main() {
  std::ofstream out("independent-certificate.json");
  out << "{\"method\":\"exhaustive breadth-first search with exact dyadic arithmetic; no heuristic pruning\","
      << "\"stateDenominator\":" << MASS << ",\"nodeLabels\":[\"R\",\"H\",\"J\",\"A\",\"B\"],"
      << "\"root\":0,\"edges\":[[0,1],[1,2],[2,3],[3,1],[2,4]],"
      << "\"goalsPercent\":{\"A\":24,\"B\":19},\"fullGraph\":";
  const auto full = search();
  printResult(out, full);
  std::cout << "full graph "; printResult(std::cout, full); std::cout << std::endl;
  out << ",\"edgeRemovalChecks\":[";
  for (int edge=0;edge<5;++edge) {
    const auto result = search(edge);
    if (edge) out << ',';
    out << "{\"removedEdgeIndex\":" << edge << ",\"search\":";
    printResult(out, result);
    out << '}';
    std::cout << "without edge " << edge << ' '; printResult(std::cout, result); std::cout << std::endl;
  }
  out << "],\"witness\":[0,3,0,3,1,0,1,4,0,1,4,0,1,2,4],\"witnessStates\":[";
  Weights w{MASS,0,0,0,0};
  const std::vector<int> witness{0,3,0,3,1,0,1,4,0,1,4,0,1,2,4};
  auto printWeights = [&](){ out << '['; for (int i=0;i<5;++i) { if(i)out << ','; out << w[i]; } out << ']'; };
  printWeights();
  for (int edge : witness) {
    const auto [a,b] = EDGES[edge];
    if (w[a] == w[b] || won(w) || (w[a]+w[b])%2) return 3;
    w[a]=w[b]=(w[a]+w[b])/2;
    out << ','; printWeights();
  }
  if (!won(w)) return 4;
  out << "],\"finalExactPercentages\":{ ";
  const std::array<const char*,5> labels{"R","H","J","A","B"};
  for (int i=0;i<5;++i) {
    if(i)out << ',';
    const auto numerator = uint64_t(w[i])*100;
    const auto factor = std::gcd(numerator,uint64_t(MASS));
    out << '\"' << labels[i] << "\":{\"numerator\":" << numerator/factor << ",\"denominator\":" << MASS/factor << '}';
  }
  out << "}}\n";
  return full.firstWin == 15 ? 0 : 5;
}
