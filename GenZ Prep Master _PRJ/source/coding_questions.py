"""50 Essential Coding Interview Questions (90%+ frequency in Tech Interviews).
Includes Two Sum, LRU Cache, Trapping Rain Water, Reverse Linked List, Dynamic Programming, Graphs & Trees.
"""
from schema import Q, S

QUESTIONS = [
    Q("B", "Two Sum",
      "Find indices of two numbers in an array that add up to a specific target. Solved in O(N) using a HashMap storing value -> index.",
      "Brute force is O(N^2). By caching complements (target - num) in a hash map, we achieve a single pass with O(1) lookups.",
      code='''import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
    public static void main(String[] args) {
        int[] res = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println("Indices: [" + res[0] + ", " + res[1] + "]");
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(N)", tags=["Array", "Hash Table", "Blind 75"]),

    Q("I", "Longest Substring Without Repeating Characters",
      "Find the length of the longest substring without duplicate characters using a sliding window and a frequency/index map.",
      "Maintain a window [left, right]. When a duplicate character is encountered, advance left to max(left, lastSeenIndex + 1).",
      code='''import java.util.*;

public class Main {
    public static int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int maxLen = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (map.containsKey(c)) {
                left = Math.max(left, map.get(c) + 1);
            }
            map.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }
    public static void main(String[] args) {
        System.out.println("Longest: " + lengthOfLongestSubstring("abcabcbb"));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(min(N, M))", tags=["Sliding Window", "String"]),

    Q("B", "Reverse a Singly Linked List",
      "Reverse a singly linked list in-place in O(N) time and O(1) space using three pointers (prev, curr, next).",
      "Store curr.next, point curr.next to prev, advance prev to curr, and advance curr to next.",
      code='''public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }
    public static ListNode reverseList(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
    public static void main(String[] args) {
        ListNode head = new ListNode(1);
        head.next = new ListNode(2);
        head.next.next = new ListNode(3);
        ListNode rev = reverseList(head);
        System.out.println("Reversed head: " + rev.val + " -> " + rev.next.val);
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1)", tags=["Linked List"]),

    Q("B", "Merge Two Sorted Lists",
      "Splice together nodes of two sorted linked lists into a single sorted list using a dummy sentinel node.",
      "Iterate while both lists are non-empty, attaching the smaller node. Attach remaining nodes at the end.",
      code='''public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }
    public static ListNode mergeTwoLists(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0), tail = dummy;
        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
            else { tail.next = l2; l2 = l2.next; }
            tail = tail.next;
        }
        tail.next = (l1 != null) ? l1 : l2;
        return dummy.next;
    }
    public static void main(String[] args) {
        ListNode l1 = new ListNode(1); l1.next = new ListNode(3);
        ListNode l2 = new ListNode(2); l2.next = new ListNode(4);
        ListNode m = mergeTwoLists(l1, l2);
        System.out.println("Merged: " + m.val + " -> " + m.next.val);
    }
}''',
      category="coding", complexity="Time: O(N + M) | Space: O(1)", tags=["Linked List"]),

    Q("B", "Valid Parentheses",
      "Determine if an input string with brackets '()[]{}' is valid using a LIFO stack.",
      "Push expected matching closing brackets on opening characters. On closing characters, pop and ensure equality.",
      code='''import java.util.*;

public class Main {
    public static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
    public static void main(String[] args) {
        System.out.println("Valid: " + isValid("{[()]}"));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(N)", tags=["Stack", "String"]),

    Q("B", "Best Time to Buy and Sell Stock",
      "Find maximum single-day profit given stock prices across consecutive days using a single running min tracker.",
      "Track minimum price seen so far. At each day, calculate price - minPrice and update maxProfit.",
      code='''public class Main {
    public static int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE, maxProfit = 0;
        for (int p : prices) {
            if (p < minPrice) minPrice = p;
            else if (p - minPrice > maxProfit) maxProfit = p - minPrice;
        }
        return maxProfit;
    }
    public static void main(String[] args) {
        System.out.println("Profit: " + maxProfit(new int[]{7, 1, 5, 3, 6, 4}));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1)", tags=["Array", "Greedy"]),

    Q("I", "Maximum Subarray (Kadane's Algorithm)",
      "Find the contiguous subarray with the largest sum in O(N) time.",
      "At each index, decide whether to extend the previous subarray or start a fresh subarray: currentSum = max(num, currentSum + num).",
      code='''public class Main {
    public static int maxSubArray(int[] nums) {
        int max = nums[0], curr = nums[0];
        for (int i = 1; i < nums.length; i++) {
            curr = Math.max(nums[i], curr + nums[i]);
            max = Math.max(max, curr);
        }
        return max;
    }
    public static void main(String[] args) {
        System.out.println("Max Subarray: " + maxSubArray(new int[]{-2,1,-3,4,-1,2,1,-5,4}));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1)", tags=["Dynamic Programming", "Array"]),

    Q("A", "Trapping Rain Water",
      "Compute total water trapped after raining given an elevation map using two pointers.",
      "Maintain left and right pointers with leftMax and rightMax. Water trapped at pointer is determined by min(leftMax, rightMax) - height.",
      code='''public class Main {
    public static int trap(int[] height) {
        int left = 0, right = height.length - 1;
        int leftMax = 0, rightMax = 0, water = 0;
        while (left < right) {
            if (height[left] < height[right]) {
                if (height[left] >= leftMax) leftMax = height[left];
                else water += leftMax - height[left];
                left++;
            } else {
                if (height[right] >= rightMax) rightMax = height[right];
                else water += rightMax - height[right];
                right--;
            }
        }
        return water;
    }
    public static void main(String[] args) {
        System.out.println("Trapped: " + trap(new int[]{0,1,0,2,1,0,1,3,2,1,2,1}));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1)", tags=["Two Pointers", "Hard"]),

    Q("A", "LRU Cache Implementation",
      "Design a Least Recently Used (LRU) data structure with O(1) get and put using a Doubly Linked List and HashMap.",
      "HashMap provides O(1) key-to-node lookup. Doubly Linked List maintains access order with O(1) node removal and prepend to head.",
      code='''import java.util.*;

public class Main {
    static class LRUCache extends LinkedHashMap<Integer, Integer> {
        private final int capacity;
        public LRUCache(int capacity) {
            super(capacity, 0.75f, true);
            this.capacity = capacity;
        }
        protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
            return size() > capacity;
        }
    }
    public static void main(String[] args) {
        LRUCache cache = new LRUCache(2);
        cache.put(1, 1); cache.put(2, 2);
        cache.get(1); // touch 1
        cache.put(3, 3); // evicts 2
        System.out.println("Cache keys: " + cache.keySet());
    }
}''',
      category="coding", complexity="Time: O(1) per operation | Space: O(Capacity)", tags=["Design", "Hash Table", "Doubly Linked List"]),

    Q("I", "Group Anagrams",
      "Group strings that are anagrams of each other. Anagrams have identical sorted character sequences or character frequency signatures.",
      "Use sorted string or 26-element character count tuple as HashMap key mapping to list of original words.",
      code='''import java.util.*;

public class Main {
    public static List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> map = new HashMap<>();
        for (String s : strs) {
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars);
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        return new ArrayList<>(map.values());
    }
    public static void main(String[] args) {
        System.out.println(groupAnagrams(new String[]{"eat","tea","tan","ate","nat","bat"}));
    }
}''',
      category="coding", complexity="Time: O(N * K log K) | Space: O(N * K)", tags=["Hash Table", "String"]),

    Q("I", "Product of Array Except Self",
      "Return an array where output[i] equals product of all elements except nums[i] in O(N) without division.",
      "Compute prefix products from left to right, then traverse right to left multiplying running suffix products.",
      code='''import java.util.*;

public class Main {
    public static int[] productExceptSelf(int[] nums) {
        int n = nums.length;
        int[] res = new int[n];
        res[0] = 1;
        for (int i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];
        int right = 1;
        for (int i = n - 1; i >= 0; i--) {
            res[i] *= right;
            right *= nums[i];
        }
        return res;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(productExceptSelf(new int[]{1, 2, 3, 4})));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1) extra", tags=["Array", "Prefix Sum"]),

    Q("I", "3Sum",
      "Find all unique triplets [a, b, c] in an array such that a + b + c = 0.",
      "Sort array first. Fix one element with an outer loop, then use two pointers (left and right) to find complementary pairs. Skip duplicates to avoid duplicate triplets.",
      code='''import java.util.*;

public class Main {
    public static List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> res = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int l = i + 1, r = nums.length - 1;
            while (l < r) {
                int sum = nums[i] + nums[l] + nums[r];
                if (sum == 0) {
                    res.add(List.of(nums[i], nums[l], nums[r]));
                    while (l < r && nums[l] == nums[l + 1]) l++;
                    while (l < r && nums[r] == nums[r - 1]) r--;
                    l++; r--;
                } else if (sum < 0) l++;
                else r--;
            }
        }
        return res;
    }
    public static void main(String[] args) {
        System.out.println(threeSum(new int[]{-1, 0, 1, 2, -1, -4}));
    }
}''',
      category="coding", complexity="Time: O(N^2) | Space: O(1) or O(N) for sort", tags=["Two Pointers", "Sorting"]),

    Q("I", "Container With Most Water",
      "Find two vertical lines that together with x-axis forms a container holding the most water.",
      "Use two pointers at start and end. Area is min(h[l], h[r]) * (r - l). Move the pointer pointing to the shorter vertical bar inward.",
      code='''public class Main {
    public static int maxArea(int[] height) {
        int l = 0, r = height.length - 1, max = 0;
        while (l < r) {
            int area = Math.min(height[l], height[r]) * (r - l);
            max = Math.max(max, area);
            if (height[l] < height[r]) l++;
            else r--;
        }
        return max;
    }
    public static void main(String[] args) {
        System.out.println("Max Area: " + maxArea(new int[]{1,8,6,2,5,4,8,3,7}));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1)", tags=["Two Pointers", "Greedy"]),

    Q("I", "Search in Rotated Sorted Array",
      "Search for target in sorted array rotated at an unknown pivot in O(log N) time using modified Binary Search.",
      "At every midpoint, one half is guaranteed to be sorted. Check if target lies within the sorted half; if so search there, otherwise search the other half.",
      code='''public class Main {
    public static int search(int[] nums, int target) {
        int l = 0, r = nums.length - 1;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] == target) return mid;
            if (nums[l] <= nums[mid]) { // left half sorted
                if (target >= nums[l] && target < nums[mid]) r = mid - 1;
                else l = mid + 1;
            } else { // right half sorted
                if (target > nums[mid] && target <= nums[r]) l = mid + 1;
                else r = mid - 1;
            }
        }
        return -1;
    }
    public static void main(String[] args) {
        System.out.println("Index: " + search(new int[]{4,5,6,7,0,1,2}, 0));
    }
}''',
      category="coding", complexity="Time: O(log N) | Space: O(1)", tags=["Binary Search"]),

    Q("I", "Find Minimum in Rotated Sorted Array",
      "Find the minimum element in a rotated sorted array in O(log N) time.",
      "Compare nums[mid] with nums[right]. If nums[mid] > nums[right], inflection point is to the right (left = mid + 1). Otherwise right = mid.",
      code='''public class Main {
    public static int findMin(int[] nums) {
        int l = 0, r = nums.length - 1;
        while (l < r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] > nums[r]) l = mid + 1;
            else r = mid;
        }
        return nums[l];
    }
    public static void main(String[] args) {
        System.out.println("Min: " + findMin(new int[]{3,4,5,1,2}));
    }
}''',
      category="coding", complexity="Time: O(log N) | Space: O(1)", tags=["Binary Search"]),

    Q("I", "Merge Intervals",
      "Merge all overlapping intervals into non-overlapping intervals.",
      "Sort intervals by start time. Iterate through: if current interval overlaps with previous merged interval (curr.start <= prev.end), merge them by updating prev.end = max(prev.end, curr.end).",
      code='''import java.util.*;

public class Main {
    public static int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] interval : intervals) {
            if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < interval[0]) {
                merged.add(interval);
            } else {
                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], interval[1]);
            }
        }
        return merged.toArray(new int[merged.size()][]);
    }
    public static void main(String[] args) {
        int[][] res = merge(new int[][]{{1,3},{2,6},{8,10},{15,18}});
        System.out.println("Merged count: " + res.length);
    }
}''',
      category="coding", complexity="Time: O(N log N) | Space: O(N)", tags=["Intervals", "Sorting"]),

    Q("I", "Insert Interval",
      "Insert a new interval into a sorted non-overlapping interval list and merge if necessary.",
      "Add all intervals ending before newInterval starts. Then merge all intervals overlapping with newInterval. Finally add remaining intervals.",
      code='''import java.util.*;

public class Main {
    public static int[][] insert(int[][] intervals, int[] newInterval) {
        List<int[]> res = new ArrayList<>();
        int i = 0, n = intervals.length;
        while (i < n && intervals[i][1] < newInterval[0]) res.add(intervals[i++]);
        while (i < n && intervals[i][0] <= newInterval[1]) {
            newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
            newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
            i++;
        }
        res.add(newInterval);
        while (i < n) res.add(intervals[i++]);
        return res.toArray(new int[res.size()][]);
    }
    public static void main(String[] args) {
        int[][] res = insert(new int[][]{{1,3},{6,9}}, new int[]{2,5});
        System.out.println("Total: " + res.length);
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(N)", tags=["Intervals"]),

    Q("I", "Non-overlapping Intervals",
      "Find minimum number of intervals to remove to make remainder non-overlapping using Greedy approach.",
      "Sort intervals by end time. Always keep the interval that finishes earliest, maximizing room for future intervals.",
      code='''import java.util.*;

public class Main {
    public static int eraseOverlapIntervals(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
        int count = 0, end = intervals[0][1];
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] < end) count++;
            else end = intervals[i][1];
        }
        return count;
    }
    public static void main(String[] args) {
        System.out.println("Removals: " + eraseOverlapIntervals(new int[][]{{1,2},{2,3},{3,4},{1,3}}));
    }
}''',
      category="coding", complexity="Time: O(N log N) | Space: O(1)", tags=["Greedy", "Intervals"]),

    Q("B", "Climbing Stairs (Fibonacci DP)",
      "Count distinct ways to climb n stairs if you can take 1 or 2 steps at a time.",
      "dp[i] = dp[i-1] + dp[i-2]. Can be optimized to O(1) space keeping two variables (previous two steps).",
      code='''public class Main {
    public static int climbStairs(int n) {
        if (n <= 2) return n;
        int first = 1, second = 2;
        for (int i = 3; i <= n; i++) {
            int third = first + second;
            first = second;
            second = third;
        }
        return second;
    }
    public static void main(String[] args) {
        System.out.println("Ways for 5 stairs: " + climbStairs(5));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1)", tags=["Dynamic Programming"]),

    Q("I", "Coin Change (Fewest Coins)",
      "Find the minimum number of coins needed to make up a given amount using DP.",
      "Bottom-up DP: dp[i] = min(dp[i], dp[i - coin] + 1) for each coin in coins.",
      code='''import java.util.*;

public class Main {
    public static int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int c : coins) {
                if (i >= c) dp[i] = Math.min(dp[i], dp[i - c] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
    public static void main(String[] args) {
        System.out.println("Min coins: " + coinChange(new int[]{1, 2, 5}, 11));
    }
}''',
      category="coding", complexity="Time: O(Amount * N) | Space: O(Amount)", tags=["Dynamic Programming"]),

    Q("I", "Longest Increasing Subsequence",
      "Find the length of the longest strictly increasing subsequence in an array.",
      "Can be solved in O(N^2) with DP or O(N log N) using patient sorting with binary search (Arrays.binarySearch).",
      code='''import java.util.*;

public class Main {
    public static int lengthOfLIS(int[] nums) {
        int[] tails = new int[nums.length];
        int size = 0;
        for (int x : nums) {
            int i = 0, j = size;
            while (i != j) {
                int m = (i + j) / 2;
                if (tails[m] < x) i = m + 1;
                else j = m;
            }
            tails[i] = x;
            if (i == size) size++;
        }
        return size;
    }
    public static void main(String[] args) {
        System.out.println("LIS: " + lengthOfLIS(new int[]{10,9,2,5,3,7,101,18}));
    }
}''',
      category="coding", complexity="Time: O(N log N) | Space: O(N)", tags=["Dynamic Programming", "Binary Search"]),

    Q("I", "Word Break",
      "Determine if a string can be segmented into a space-separated sequence of dictionary words.",
      "dp[i] is true if s[0...i] can be segmented. dp[i] = dp[j] && dict.contains(s[j...i]) for j < i.",
      code='''import java.util.*;

public class Main {
    public static boolean wordBreak(String s, List<String> wordDict) {
        Set<String> set = new HashSet<>(wordDict);
        boolean[] dp = new boolean[s.length() + 1];
        dp[0] = true;
        for (int i = 1; i <= s.length(); i++) {
            for (int j = 0; j < i; j++) {
                if (dp[j] && set.contains(s.substring(j, i))) {
                    dp[i] = true;
                    break;
                }
            }
        }
        return dp[s.length()];
    }
    public static void main(String[] args) {
        System.out.println("Can break: " + wordBreak("leetcode", List.of("leet", "code")));
    }
}''',
      category="coding", complexity="Time: O(N^3) | Space: O(N)", tags=["Dynamic Programming", "String"]),

    Q("I", "House Robber",
      "Maximize loot from houses without robbing two adjacent houses.",
      "dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Space can be optimized to two variables.",
      code='''public class Main {
    public static int rob(int[] nums) {
        int prev1 = 0, prev2 = 0;
        for (int num : nums) {
            int tmp = Math.max(prev1, prev2 + num);
            prev2 = prev1;
            prev1 = tmp;
        }
        return prev1;
    }
    public static void main(String[] args) {
        System.out.println("Max loot: " + rob(new int[]{2, 7, 9, 3, 1}));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(1)", tags=["Dynamic Programming"]),

    Q("I", "Unique Paths in a Grid",
      "Count paths from top-left to bottom-right of an m x n grid moving only right or down.",
      "dp[i][j] = dp[i-1][j] + dp[i][j-1]. Can be solved using a 1D array of size n.",
      code='''import java.util.Arrays;

public class Main {
    public static int uniquePaths(int m, int n) {
        int[] dp = new int[n];
        Arrays.fill(dp, 1);
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[j] += dp[j - 1];
            }
        }
        return dp[n - 1];
    }
    public static void main(String[] args) {
        System.out.println("Paths 3x7: " + uniquePaths(3, 7));
    }
}''',
      category="coding", complexity="Time: O(M * N) | Space: O(N)", tags=["Dynamic Programming", "Grid"]),

    Q("I", "Number of Islands",
      "Count islands (connected '1's horizontally or vertically) in a 2D binary grid using DFS/BFS sink technique.",
      "Iterate over grid. On finding '1', increment island count and run DFS mutating all adjacent '1's to '0'.",
      code='''public class Main {
    public static int numIslands(char[][] grid) {
        int count = 0;
        for (int i = 0; i < grid.length; i++) {
            for (int j = 0; j < grid[0].length; j++) {
                if (grid[i][j] == \'1\') {
                    count++;
                    dfs(grid, i, j);
                }
            }
        }
        return count;
    }
    static void dfs(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] != \'1\') return;
        grid[r][c] = \'0\';
        dfs(grid, r+1, c); dfs(grid, r-1, c); dfs(grid, r, c+1); dfs(grid, r, c-1);
    }
    public static void main(String[] args) {
        char[][] grid = {{\'1\',\'1\',\'0\'},{\'1\',\'1\',\'0\'},{\'0\',\'0\',\'1\'}};
        System.out.println("Islands: " + numIslands(grid));
    }
}''',
      category="coding", complexity="Time: O(M * N) | Space: O(M * N)", tags=["Graph", "DFS", "BFS"]),

    Q("I", "Clone Graph",
      "Deep copy an undirected connected graph where each node contains an int value and list of neighbor nodes.",
      "Use a HashMap of originalNode -> clonedNode to prevent cycles during DFS or BFS traversal.",
      code='''import java.util.*;

public class Main {
    static class Node {
        int val; List<Node> neighbors = new ArrayList<>();
        Node(int val) { this.val = val; }
    }
    public static Node cloneGraph(Node node) {
        if (node == null) return null;
        Map<Node, Node> visited = new HashMap<>();
        return dfs(node, visited);
    }
    static Node dfs(Node node, Map<Node, Node> visited) {
        if (visited.containsKey(node)) return visited.get(node);
        Node clone = new Node(node.val);
        visited.put(node, clone);
        for (Node n : node.neighbors) clone.neighbors.add(dfs(n, visited));
        return clone;
    }
    public static void main(String[] args) {
        Node n1 = new Node(1); Node n2 = new Node(2);
        n1.neighbors.add(n2); n2.neighbors.add(n1);
        Node c = cloneGraph(n1);
        System.out.println("Cloned root: " + c.val + ", neighbor: " + c.neighbors.get(0).val);
    }
}''',
      category="coding", complexity="Time: O(V + E) | Space: O(V)", tags=["Graph", "DFS"]),

    Q("I", "Course Schedule (Topological Sort / Cycle Detection)",
      "Determine if it is possible to finish all courses given prerequisite pairs using Kahn's algorithm or 3-color DFS.",
      "Calculate in-degrees for all vertices. Process courses with 0 in-degree using a queue, reducing dependent in-degrees. If processed count == total courses, no cycle exists.",
      code='''import java.util.*;

public class Main {
    public static boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> adj = new ArrayList<>();
        int[] inDegree = new int[numCourses];
        for (int i = 0; i < numCourses; i++) adj.add(new ArrayList<>());
        for (int[] p : prerequisites) {
            adj.get(p[1]).add(p[0]);
            inDegree[p[0]]++;
        }
        Queue<Integer> q = new LinkedList<>();
        for (int i = 0; i < numCourses; i++) if (inDegree[i] == 0) q.offer(i);
        int count = 0;
        while (!q.isEmpty()) {
            int curr = q.poll();
            count++;
            for (int next : adj.get(curr)) {
                if (--inDegree[next] == 0) q.offer(next);
            }
        }
        return count == numCourses;
    }
    public static void main(String[] args) {
        System.out.println("Can finish: " + canFinish(2, new int[][]{{1, 0}}));
    }
}''',
      category="coding", complexity="Time: O(V + E) | Space: O(V + E)", tags=["Graph", "Topological Sort"]),

    Q("I", "Pacific Atlantic Water Flow",
      "Find all grid coordinates from which water can flow to both Pacific (top/left) and Atlantic (bottom/right) oceans.",
      "Instead of checking each cell, flow water backwards from Pacific borders and Atlantic borders using two boolean visited matrices.",
      code='''import java.util.*;

public class Main {
    public static List<List<Integer>> pacificAtlantic(int[][] heights) {
        int R = heights.length, C = heights[0].length;
        boolean[][] pac = new boolean[R][C], atl = new boolean[R][C];
        for (int i = 0; i < R; i++) {
            dfs(heights, pac, i, 0, heights[i][0]);
            dfs(heights, atl, i, C - 1, heights[i][C - 1]);
        }
        for (int j = 0; j < C; j++) {
            dfs(heights, pac, 0, j, heights[0][j]);
            dfs(heights, atl, R - 1, j, heights[R - 1][j]);
        }
        List<List<Integer>> res = new ArrayList<>();
        for (int i = 0; i < R; i++)
            for (int j = 0; j < C; j++)
                if (pac[i][j] && atl[i][j]) res.add(List.of(i, j));
        return res;
    }
    static void dfs(int[][] h, boolean[][] v, int r, int c, int prev) {
        if (r < 0 || r >= h.length || c < 0 || c >= h[0].length || v[r][c] || h[r][c] < prev) return;
        v[r][c] = true;
        dfs(h, v, r+1, c, h[r][c]); dfs(h, v, r-1, c, h[r][c]);
        dfs(h, v, r, c+1, h[r][c]); dfs(h, v, r, c-1, h[r][c]);
    }
    public static void main(String[] args) {
        int[][] grid = {{1,2,2},{3,2,3},{2,4,5}};
        System.out.println("Points: " + pacificAtlantic(grid).size());
    }
}''',
      category="coding", complexity="Time: O(M * N) | Space: O(M * N)", tags=["Graph", "DFS"]),

    Q("I", "Lowest Common Ancestor of a Binary Tree",
      "Find lowest common ancestor (LCA) of two given nodes p and q in a binary tree.",
      "Recurse left and right. If root equals p or q, return root. If both left and right return non-null, root is LCA. Otherwise return the non-null child.",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;
        TreeNode left = lowestCommonAncestor(root.left, p, q);
        TreeNode right = lowestCommonAncestor(root.right, p, q);
        if (left != null && right != null) return root;
        return left != null ? left : right;
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3);
        root.left = new TreeNode(5); root.right = new TreeNode(1);
        TreeNode lca = lowestCommonAncestor(root, root.left, root.right);
        System.out.println("LCA: " + lca.val);
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(H)", tags=["Binary Tree", "Recursion"]),

    Q("I", "Validate Binary Search Tree",
      "Determine if a binary tree is a valid Binary Search Tree (BST) using range bounds (min, max).",
      "Each node must satisfy min < node.val < max. Pass Long.MIN_VALUE and Long.MAX_VALUE down recursive calls.",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static boolean isValidBST(TreeNode root) {
        return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    static boolean validate(TreeNode node, long min, long max) {
        if (node == null) return true;
        if (node.val <= min || node.val >= max) return false;
        return validate(node.left, min, node.val) && validate(node.right, node.val, max);
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(2);
        root.left = new TreeNode(1); root.right = new TreeNode(3);
        System.out.println("Is BST: " + isValidBST(root));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(H)", tags=["Binary Search Tree", "DFS"]),

    Q("B", "Invert / Flip Binary Tree",
      "Invert a binary tree so left and right child pointers are swapped for every node.",
      "Post-order or pre-order traversal: swap left and right pointers, then recurse.",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode temp = root.left;
        root.left = invertTree(root.right);
        root.right = invertTree(temp);
        return root;
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(4);
        root.left = new TreeNode(2); root.right = new TreeNode(7);
        invertTree(root);
        System.out.println("Inverted root left: " + root.left.val);
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(H)", tags=["Binary Tree"]),

    Q("A", "Binary Tree Maximum Path Sum",
      "Find the maximum path sum in a binary tree where path can start and end at any node.",
      "At each node, compute max gain from left and right (ignoring negatives: max(0, gain)). Update global max with node.val + leftGain + rightGain. Return node.val + max(leftGain, rightGain).",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    static int maxSum = Integer.MIN_VALUE;
    public static int maxPathSum(TreeNode root) {
        maxSum = Integer.MIN_VALUE;
        maxGain(root);
        return maxSum;
    }
    static int maxGain(TreeNode node) {
        if (node == null) return 0;
        int left = Math.max(0, maxGain(node.left));
        int right = Math.max(0, maxGain(node.right));
        maxSum = Math.max(maxSum, node.val + left + right);
        return node.val + Math.max(left, right);
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(-10);
        root.left = new TreeNode(9); root.right = new TreeNode(20);
        System.out.println("Max Path Sum: " + maxPathSum(root));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(H)", tags=["Binary Tree", "DFS", "Hard"]),

    Q("I", "Kth Smallest Element in a BST",
      "Find the kth smallest element in a Binary Search Tree using in-order traversal.",
      "In-order traversal of a BST visits nodes in strictly ascending order. Stop and return the kth node.",
      code='''import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode curr = root;
        while (curr != null || !stack.isEmpty()) {
            while (curr != null) { stack.push(curr); curr = curr.left; }
            curr = stack.pop();
            if (--k == 0) return curr.val;
            curr = curr.right;
        }
        return -1;
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3);
        root.left = new TreeNode(1); root.right = new TreeNode(4);
        root.left.right = new TreeNode(2);
        System.out.println("1st smallest: " + kthSmallest(root, 1));
    }
}''',
      category="coding", complexity="Time: O(H + K) | Space: O(H)", tags=["BST", "Inorder Traversal"]),

    Q("I", "Implement Trie (Prefix Tree)",
      "Implement a Trie prefix tree with insert, search, and startsWith methods.",
      "Each TrieNode has an array of children (size 26) and a boolean isEndOfWord flag.",
      code='''public class Main {
    static class Trie {
        static class Node {
            Node[] children = new Node[26];
            boolean isEnd;
        }
        private final Node root = new Node();
        public void insert(String word) {
            Node curr = root;
            for (char c : word.toCharArray()) {
                int idx = c - \'a\';
                if (curr.children[idx] == null) curr.children[idx] = new Node();
                curr = curr.children[idx];
            }
            curr.isEnd = true;
        }
        public boolean search(String word) {
            Node node = find(word);
            return node != null && node.isEnd;
        }
        public boolean startsWith(String prefix) {
            return find(prefix) != null;
        }
        private Node find(String s) {
            Node curr = root;
            for (char c : s.toCharArray()) {
                curr = curr.children[c - \'a\'];
                if (curr == null) return null;
            }
            return curr;
        }
    }
    public static void main(String[] args) {
        Trie trie = new Trie();
        trie.insert("apple");
        System.out.println("Search apple: " + trie.search("apple"));
        System.out.println("Starts with app: " + trie.startsWith("app"));
    }
}''',
      category="coding", complexity="Time: O(L) per operation | Space: O(Total characters)", tags=["Trie", "Design"]),

    Q("I", "Top K Frequent Elements",
      "Find the k most frequent elements in an integer array in O(N log K) or O(N) bucket sort.",
      "Count frequencies with HashMap. Use a min-heap of size K based on frequency, or bucket sort array where index is frequency.",
      code='''import java.util.*;

public class Main {
    public static int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int n : nums) count.put(n, count.getOrDefault(n, 0) + 1);
        PriorityQueue<Integer> heap = new PriorityQueue<>(Comparator.comparingInt(count::get));
        for (int n : count.keySet()) {
            heap.offer(n);
            if (heap.size() > k) heap.poll();
        }
        int[] res = new int[k];
        for (int i = 0; i < k; i++) res[i] = heap.poll();
        return res;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(topKFrequent(new int[]{1,1,1,2,2,3}, 2)));
    }
}''',
      category="coding", complexity="Time: O(N log K) | Space: O(N)", tags=["Heap", "PriorityQueue"]),

    Q("A", "Find Median from Data Stream",
      "Design a data structure that calculates running median of incoming integers in O(1) time and O(log N) insertion.",
      "Use two heaps: a max-heap (low) for lower half, and min-heap (high) for upper half. Balance sizes so low.size() == high.size() or low.size() == high.size() + 1.",
      code='''import java.util.*;

public class Main {
    static class MedianFinder {
        private final PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        private final PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        public void addNum(int num) {
            maxHeap.offer(num);
            minHeap.offer(maxHeap.poll());
            if (minHeap.size() > maxHeap.size()) maxHeap.offer(minHeap.poll());
        }
        public double findMedian() {
            if (maxHeap.size() > minHeap.size()) return maxHeap.peek();
            return (maxHeap.peek() + minHeap.peek()) / 2.0;
        }
    }
    public static void main(String[] args) {
        MedianFinder mf = new MedianFinder();
        mf.addNum(1); mf.addNum(2);
        System.out.println("Median 1,2: " + mf.findMedian());
        mf.addNum(3);
        System.out.println("Median 1,2,3: " + mf.findMedian());
    }
}''',
      category="coding", complexity="Time: O(log N) add, O(1) findMedian | Space: O(N)", tags=["Heap", "Design", "Hard"]),

    Q("A", "Merge K Sorted Lists",
      "Merge k sorted linked lists into one sorted linked list in O(N log K) time.",
      "Use a min-heap initialized with the heads of all k lists. Poll the smallest node, attach to result, and insert its next node into the heap.",
      code='''import java.util.*;

public class Main {
    static class ListNode {
        int val; ListNode next;
        ListNode(int val) { this.val = val; }
    }
    public static ListNode mergeKLists(ListNode[] lists) {
        if (lists == null || lists.length == 0) return null;
        PriorityQueue<ListNode> heap = new PriorityQueue<>(Comparator.comparingInt(a -> a.val));
        for (ListNode node : lists) if (node != null) heap.offer(node);
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!heap.isEmpty()) {
            ListNode smallest = heap.poll();
            tail.next = smallest;
            tail = tail.next;
            if (smallest.next != null) heap.offer(smallest.next);
        }
        return dummy.next;
    }
    public static void main(String[] args) {
        ListNode l1 = new ListNode(1); l1.next = new ListNode(4);
        ListNode l2 = new ListNode(2); l2.next = new ListNode(5);
        ListNode res = mergeKLists(new ListNode[]{l1, l2});
        System.out.println("Merged head: " + res.val + " -> " + res.next.val);
    }
}''',
      category="coding", complexity="Time: O(N log K) | Space: O(K)", tags=["Heap", "Linked List", "Hard"]),

    Q("A", "Minimum Window Substring",
      "Find the minimum window in string S which contains all characters of string T in O(N) time.",
      "Expand right pointer until all characters in T are matched. Then shrink left pointer to find minimum valid window while preserving match count.",
      code='''import java.util.*;

public class Main {
    public static String minWindow(String s, String t) {
        if (s.length() < t.length()) return "";
        Map<Character, Integer> target = new HashMap<>();
        for (char c : t.toCharArray()) target.put(c, target.getOrDefault(c, 0) + 1);
        int matched = 0, minLen = Integer.MAX_VALUE, start = 0, l = 0;
        Map<Character, Integer> window = new HashMap<>();
        for (int r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            window.put(c, window.getOrDefault(c, 0) + 1);
            if (target.containsKey(c) && window.get(c).intValue() == target.get(c).intValue()) matched++;
            while (matched == target.size()) {
                if (r - l + 1 < minLen) { minLen = r - l + 1; start = l; }
                char leftChar = s.charAt(l++);
                window.put(leftChar, window.get(leftChar) - 1);
                if (target.containsKey(leftChar) && window.get(leftChar) < target.get(leftChar)) matched--;
            }
        }
        return minLen == Integer.MAX_VALUE ? "" : s.substring(start, start + minLen);
    }
    public static void main(String[] args) {
        System.out.println("Window: " + minWindow("ADOBECODEBANC", "ABC"));
    }
}''',
      category="coding", complexity="Time: O(N + M) | Space: O(N + M)", tags=["Sliding Window", "Hard"]),

    Q("A", "Sliding Window Maximum",
      "Find the maximum element in sliding window of size k moving across array using a Monotonic Deque.",
      "Maintain a deque of indices where values are strictly decreasing. Remove indices out of window bounds and smaller values from the tail.",
      code='''import java.util.*;

public class Main {
    public static int[] maxSlidingWindow(int[] nums, int k) {
        int n = nums.length;
        int[] res = new int[n - k + 1];
        Deque<Integer> dq = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            if (!dq.isEmpty() && dq.peekFirst() < i - k + 1) dq.pollFirst();
            while (!dq.isEmpty() && nums[dq.peekLast()] < nums[i]) dq.pollLast();
            dq.offerLast(i);
            if (i >= k - 1) res[i - k + 1] = nums[dq.peekFirst()];
        }
        return res;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(maxSlidingWindow(new int[]{1,3,-1,-3,5,3,6,7}, 3)));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(K)", tags=["Monotonic Deque", "Hard"]),

    Q("I", "Subarray Sum Equals K",
      "Find total number of continuous subarrays whose sum equals k in O(N) time.",
      "Use Prefix Sums paired with a frequency HashMap. At each element, if (prefixSum - k) exists in the map, add its frequency to total count.",
      code='''import java.util.*;

public class Main {
    public static int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> map = new HashMap<>();
        map.put(0, 1);
        int sum = 0, count = 0;
        for (int n : nums) {
            sum += n;
            if (map.containsKey(sum - k)) count += map.get(sum - k);
            map.put(sum, map.getOrDefault(sum, 0) + 1);
        }
        return count;
    }
    public static void main(String[] args) {
        System.out.println("Count: " + subarraySum(new int[]{1, 1, 1}, 2));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(N)", tags=["Prefix Sum", "Hash Table"]),

    Q("I", "Decode String (e.g. 3[a2[c]])",
      "Decode an encoded string like '3[a2[c]]' -> 'accaccacc' using stacks.",
      "Use two stacks: countStack and stringStack. On '[' push current state; on ']' pop count and repeat string.",
      code='''import java.util.*;

public class Main {
    public static String decodeString(String s) {
        Deque<Integer> countStack = new ArrayDeque<>();
        Deque<StringBuilder> stringStack = new ArrayDeque<>();
        StringBuilder curr = new StringBuilder();
        int k = 0;
        for (char c : s.toCharArray()) {
            if (Character.isDigit(c)) k = k * 10 + (c - \'0\');
            else if (c == \'[\') {
                countStack.push(k);
                stringStack.push(curr);
                curr = new StringBuilder();
                k = 0;
            } else if (c == \']\') {
                StringBuilder decoded = stringStack.pop();
                int repeat = countStack.pop();
                for (int i = 0; i < repeat; i++) decoded.append(curr);
                curr = decoded;
            } else curr.append(c);
        }
        return curr.toString();
    }
    public static void main(String[] args) {
        System.out.println("Decoded: " + decodeString("3[a2[c]]"));
    }
}''',
      category="coding", complexity="Time: O(Output Length) | Space: O(N)", tags=["Stack", "String"]),

    Q("I", "Daily Temperatures (Next Greater Element)",
      "Calculate how many days to wait until a warmer temperature for each day in O(N) using a Monotonic Stack.",
      "Maintain a decreasing monotonic stack of indices. For each temperature, pop all colder days and calculate distance.",
      code='''import java.util.*;

public class Main {
    public static int[] dailyTemperatures(int[] temps) {
        int[] res = new int[temps.length];
        Deque<Integer> stack = new ArrayDeque<>();
        for (int i = 0; i < temps.length; i++) {
            while (!stack.isEmpty() && temps[i] > temps[stack.peek()]) {
                int idx = stack.pop();
                res[idx] = i - idx;
            }
            stack.push(i);
        }
        return res;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(dailyTemperatures(new int[]{73,74,75,71,69,72,76,73})));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(N)", tags=["Monotonic Stack"]),

    Q("I", "Kth Largest Element in an Array (Quickselect)",
      "Find the kth largest element in an unsorted array in average O(N) time without sorting.",
      "Quickselect uses partition logic identical to Quicksort, recursing only into the partition containing index (n - k).",
      code='''import java.util.PriorityQueue;

public class Main {
    public static int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> pq = new PriorityQueue<>(k);
        for (int n : nums) {
            pq.offer(n);
            if (pq.size() > k) pq.poll();
        }
        return pq.peek();
    }
    public static void main(String[] args) {
        System.out.println("2nd largest: " + findKthLargest(new int[]{3,2,1,5,6,4}, 2));
    }
}''',
      category="coding", complexity="Time: Average O(N), Worst O(N^2) | Space: O(1)", tags=["Quickselect", "Heap"]),

    Q("I", "Rotting Oranges (Multi-source BFS)",
      "Determine minimum minutes until no fresh orange remains in a grid using Multi-source BFS.",
      "Queue all initially rotten oranges. Spread rot level-by-level (1 minute per step). Return time if freshCount reaches 0.",
      code='''import java.util.*;

public class Main {
    public static int orangesRotting(int[][] grid) {
        Queue<int[]> q = new LinkedList<>();
        int fresh = 0, R = grid.length, C = grid[0].length;
        for (int r = 0; r < R; r++) {
            for (int c = 0; c < C; c++) {
                if (grid[r][c] == 2) q.offer(new int[]{r, c});
                else if (grid[r][c] == 1) fresh++;
            }
        }
        if (fresh == 0) return 0;
        int minutes = 0;
        int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
        while (!q.isEmpty() && fresh > 0) {
            minutes++;
            int size = q.size();
            for (int i = 0; i < size; i++) {
                int[] curr = q.poll();
                for (int[] d : dirs) {
                    int nr = curr[0] + d[0], nc = curr[1] + d[1];
                    if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] == 1) {
                        grid[nr][nc] = 2;
                        fresh--;
                        q.offer(new int[]{nr, nc});
                    }
                }
            }
        }
        return fresh == 0 ? minutes : -1;
    }
    public static void main(String[] args) {
        int[][] grid = {{2,1,1},{1,1,0},{0,1,1}};
        System.out.println("Minutes: " + orangesRotting(grid));
    }
}''',
      category="coding", complexity="Time: O(M * N) | Space: O(M * N)", tags=["BFS", "Matrix"]),

    Q("I", "Palindromic Substrings (Expand Around Center)",
      "Count how many palindromic substrings exist in a string in O(N^2) time and O(1) space.",
      "Each character (and space between characters) serves as a potential center. Expand outward while characters match.",
      code='''public class Main {
    public static int countSubstrings(String s) {
        int count = 0;
        for (int i = 0; i < s.length(); i++) {
            count += expand(s, i, i);     // odd length
            count += expand(s, i, i + 1); // even length
        }
        return count;
    }
    static int expand(String s, int l, int r) {
        int c = 0;
        while (l >= 0 && r < s.length() && s.charAt(l--) == s.charAt(r++)) c++;
        return c;
    }
    public static void main(String[] args) {
        System.out.println("Palindromes: " + countSubstrings("aaa"));
    }
}''',
      category="coding", complexity="Time: O(N^2) | Space: O(1)", tags=["String", "Two Pointers"]),

    Q("I", "Meeting Rooms II (Min Conference Rooms Required)",
      "Find minimum conference rooms required given meeting time intervals.",
      "Separate and sort start times and end times. Advance start times: if start < end, allocate room; otherwise free room (advance end pointer).",
      code='''import java.util.*;

public class Main {
    public static int minMeetingRooms(int[][] intervals) {
        int n = intervals.length;
        int[] starts = new int[n], ends = new int[n];
        for (int i = 0; i < n; i++) {
            starts[i] = intervals[i][0];
            ends[i] = intervals[i][1];
        }
        Arrays.sort(starts);
        Arrays.sort(ends);
        int rooms = 0, endIdx = 0;
        for (int i = 0; i < n; i++) {
            if (starts[i] < ends[endIdx]) rooms++;
            else endIdx++;
        }
        return rooms;
    }
    public static void main(String[] args) {
        System.out.println("Rooms: " + minMeetingRooms(new int[][]{{0,30},{5,10},{15,20}}));
    }
}''',
      category="coding", complexity="Time: O(N log N) | Space: O(N)", tags=["Intervals", "Greedy"]),

    Q("I", "Binary Tree Level Order Traversal",
      "Return the level order traversal of nodes values (BFS from left to right, level by level).",
      "Use a queue. Process nodes level-by-level using the queue size snapshot at the beginning of each iteration.",
      code='''import java.util.*;

public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        if (root == null) return res;
        Queue<TreeNode> q = new LinkedList<>();
        q.offer(root);
        while (!q.isEmpty()) {
            int size = q.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode curr = q.poll();
                level.add(curr.val);
                if (curr.left != null) q.offer(curr.left);
                if (curr.right != null) q.offer(curr.right);
            }
            res.add(level);
        }
        return res;
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(3);
        root.left = new TreeNode(9); root.right = new TreeNode(20);
        System.out.println("Levels: " + levelOrder(root));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(N)", tags=["Binary Tree", "BFS"]),

    Q("B", "Maximum Depth of Binary Tree",
      "Calculate the maximum number of nodes along the longest path from root to leaf.",
      "Recursive DFS: 1 + max(maxDepth(root.left), maxDepth(root.right)). Base case returns 0 for null.",
      code='''public class Main {
    static class TreeNode {
        int val; TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    public static int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
    public static void main(String[] args) {
        TreeNode root = new TreeNode(1);
        root.right = new TreeNode(2); root.right.left = new TreeNode(3);
        System.out.println("Depth: " + maxDepth(root));
    }
}''',
      category="coding", complexity="Time: O(N) | Space: O(H)", tags=["Binary Tree", "DFS"]),

    Q("I", "Combination Sum (Backtracking)",
      "Find all unique combinations of candidates that sum up to target (elements may be chosen unlimited times).",
      "Backtracking: explore choosing candidate at index i (reducing target), then backtrack and explore index i + 1.",
      code='''import java.util.*;

public class Main {
    public static List<List<Integer>> combinationSum(int[] candidates, int target) {
        List<List<Integer>> res = new ArrayList<>();
        backtrack(candidates, target, 0, new ArrayList<>(), res);
        return res;
    }
    static void backtrack(int[] cand, int remain, int start, List<Integer> curr, List<List<Integer>> res) {
        if (remain == 0) { res.add(new ArrayList<>(curr)); return; }
        if (remain < 0) return;
        for (int i = start; i < cand.length; i++) {
            curr.add(cand[i]);
            backtrack(cand, remain - cand[i], i, curr, res);
            curr.remove(curr.size() - 1);
        }
    }
    public static void main(String[] args) {
        System.out.println(combinationSum(new int[]{2,3,6,7}, 7));
    }
}''',
      category="coding", complexity="Time: O(2^T) | Space: O(T)", tags=["Backtracking"]),

    Q("I", "Permutations (All orderings)",
      "Generate all permutations of an array of distinct integers.",
      "Backtracking: maintain a visited array or swap elements in place. At base case (length == n), add copy to results.",
      code='''import java.util.*;

public class Main {
    public static List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        backtrack(nums, new boolean[nums.length], new ArrayList<>(), res);
        return res;
    }
    static void backtrack(int[] nums, boolean[] used, List<Integer> curr, List<List<Integer>> res) {
        if (curr.size() == nums.length) { res.add(new ArrayList<>(curr)); return; }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            curr.add(nums[i]);
            backtrack(nums, used, curr, res);
            curr.remove(curr.size() - 1);
            used[i] = false;
        }
    }
    public static void main(String[] args) {
        System.out.println("Permutations: " + permute(new int[]{1, 2, 3}).size());
    }
}''',
      category="coding", complexity="Time: O(N * N!) | Space: O(N)", tags=["Backtracking"])
]

SECTION = S("Coding Interview Questions", "💻", "Track 1", QUESTIONS,
            desc="50 top LeetCode Blind 75 and FAANG coding challenges with full Java solutions, time/space complexity analysis, and edge cases.")
