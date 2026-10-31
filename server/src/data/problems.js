export const problemsData = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Algorithms',
    tags: ['Array', 'Hash Table'],
    acceptanceRate: 52.4,
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0,1]'
      }
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Write your code here
}`,
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[[2,7,11,15], 9]',
        parsedArgs: [[2, 7, 11, 15], 9],
        expectedOutput: [0, 1],
        isHidden: false
      },
      {
        input: '[[3,2,4], 6]',
        parsedArgs: [[3, 2, 4], 6],
        expectedOutput: [1, 2],
        isHidden: false
      },
      {
        input: '[[3,3], 6]',
        parsedArgs: [[3, 3], 6],
        expectedOutput: [0, 1],
        isHidden: false
      },
      {
        input: '[[-1,-2,-3,-4,-5], -8]',
        parsedArgs: [[-1, -2, -3, -4, -5], -8],
        expectedOutput: [2, 4],
        isHidden: true
      },
      {
        input: '[[0,4,3,0], 0]',
        parsedArgs: [[0, 4, 3, 0], 0],
        expectedOutput: [0, 3],
        isHidden: true
      }
    ],
    hints: [
      'A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Can you think of something faster than O(N^2)?',
      'Can you use a hash map to remember each number and its index in O(1) time?'
    ],
    editorial: `### Approach: One-pass Hash Table

**Intuition:**
While we iterate and insert elements into the hash table, we also look back to check if current element's complement already exists in the table. If it exists, we have found a solution and return the indices immediately.

**Complexity Analysis:**
- Time Complexity: $O(n)$, we traverse the list containing $n$ elements only once.
- Space Complexity: $O(n)$, the extra space required depends on the number of items stored in the hash table, which stores at most $n$ elements.`
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    category: 'Algorithms',
    tags: ['String', 'Stack'],
    acceptanceRate: 40.8,
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true'
      },
      {
        input: 's = "()[]{}"',
        output: 'true'
      },
      {
        input: 's = "(]"',
        output: 'false'
      },
      {
        input: 's = "([])"',
        output: 'true'
      }
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only "()[]{}"'
    ],
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  // Write your code here
}`,
      python: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '["()"]',
        parsedArgs: ['()'],
        expectedOutput: true,
        isHidden: false
      },
      {
        input: '["()[]{}"]',
        parsedArgs: ['()[]{}'],
        expectedOutput: true,
        isHidden: false
      },
      {
        input: '["(]"]',
        parsedArgs: ['(]'],
        expectedOutput: false,
        isHidden: false
      },
      {
        input: '["{[]}"]',
        parsedArgs: ['{[]}'],
        expectedOutput: true,
        isHidden: true
      },
      {
        input: '["["]',
        parsedArgs: ['['],
        expectedOutput: false,
        isHidden: true
      }
    ],
    hints: [
      'Use a stack to keep track of opening brackets as you encounter them.',
      'When you encounter a closing bracket, check if it matches the top of the stack.'
    ],
    editorial: `### Approach: Stack
Iterate through the string. Push open brackets onto the stack. For closing brackets, check if the top of the stack matches the expected opening bracket. If it matches, pop it; otherwise return false. At the end, ensure the stack is empty.`
  },
  {
    slug: 'palindrome-number',
    title: 'Palindrome Number',
    difficulty: 'Easy',
    category: 'Algorithms',
    tags: ['Math'],
    acceptanceRate: 55.1,
    description: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.

An integer is a palindrome when it reads the same forward and backward.
For example, \`121\` is a palindrome while \`123\` is not.`,
    examples: [
      {
        input: 'x = 121',
        output: 'true',
        explanation: '121 reads as 121 from left to right and from right to left.'
      },
      {
        input: 'x = -121',
        output: 'false',
        explanation: 'From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.'
      },
      {
        input: 'x = 10',
        output: 'false',
        explanation: 'Reads 01 from right to left. Therefore it is not a palindrome.'
      }
    ],
    constraints: [
      '-2^31 <= x <= 2^31 - 1'
    ],
    starterCode: {
      javascript: `/**
 * @param {number} x
 * @return {boolean}
 */
function isPalindrome(x) {
  // Write your code here
}`,
      python: `class Solution:
    def isPalindrome(self, x: int) -> bool:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[121]',
        parsedArgs: [121],
        expectedOutput: true,
        isHidden: false
      },
      {
        input: '[-121]',
        parsedArgs: [-121],
        expectedOutput: false,
        isHidden: false
      },
      {
        input: '[10]',
        parsedArgs: [10],
        expectedOutput: false,
        isHidden: false
      },
      {
        input: '[0]',
        parsedArgs: [0],
        expectedOutput: true,
        isHidden: true
      },
      {
        input: '[12321]',
        parsedArgs: [12321],
        expectedOutput: true,
        isHidden: true
      }
    ],
    hints: [
      'Beware of negative numbers: -121 is not a palindrome.',
      'Can you solve it without converting the integer to a string?'
    ],
    editorial: `### Approach: Revert Number
Negative numbers cannot be palindromes because of the minus sign. Also, any number ending in 0 (except 0 itself) cannot be a palindrome. We can reverse the digits mathematically and compare.`
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    category: 'Algorithms',
    tags: ['Array', 'Dynamic Programming'],
    acceptanceRate: 54.3,
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      {
        input: 'prices = [7,1,5,3,6,4]',
        output: '5',
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.'
      },
      {
        input: 'prices = [7,6,4,3,1]',
        output: '0',
        explanation: 'In this case, no transactions are done and the max profit = 0.'
      }
    ],
    constraints: [
      '1 <= prices.length <= 10^5',
      '0 <= prices[i] <= 10^4'
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} prices
 * @return {number}
 */
function maxProfit(prices) {
  // Write your code here
}`,
      python: `class Solution:
    def maxProfit(self, prices: list[int]) -> int:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[[7,1,5,3,6,4]]',
        parsedArgs: [[7, 1, 5, 3, 6, 4]],
        expectedOutput: 5,
        isHidden: false
      },
      {
        input: '[[7,6,4,3,1]]',
        parsedArgs: [[7, 6, 4, 3, 1]],
        expectedOutput: 0,
        isHidden: false
      },
      {
        input: '[[2,4,1]]',
        parsedArgs: [[2, 4, 1]],
        expectedOutput: 2,
        isHidden: true
      },
      {
        input: '[[3,2,6,5,0,3]]',
        parsedArgs: [[3, 2, 6, 5, 0, 3]],
        expectedOutput: 4,
        isHidden: true
      }
    ],
    hints: [
      'Track the minimum price seen so far as you iterate through the list.',
      'At each day, the potential profit is prices[i] - min_price.'
    ],
    editorial: `### Approach: One Pass
Maintain a running minimum price and compute the profit at each day against that minimum. Update maximum profit whenever a larger difference is found.`
  },
  {
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    category: 'Algorithms',
    tags: ['String', 'Sliding Window', 'Hash Table'],
    acceptanceRate: 34.6,
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.'
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.'
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3. Note that the answer must be a substring, "pwke" is a subsequence and not a substring.'
      }
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.'
    ],
    starterCode: {
      javascript: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  // Write your code here
}`,
      python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '["abcabcbb"]',
        parsedArgs: ['abcabcbb'],
        expectedOutput: 3,
        isHidden: false
      },
      {
        input: '["bbbbb"]',
        parsedArgs: ['bbbbb'],
        expectedOutput: 1,
        isHidden: false
      },
      {
        input: '["pwwkew"]',
        parsedArgs: ['pwwkew'],
        expectedOutput: 3,
        isHidden: false
      },
      {
        input: '[""]',
        parsedArgs: [''],
        expectedOutput: 0,
        isHidden: true
      },
      {
        input: '["tmmzuxt"]',
        parsedArgs: ['tmmzuxt'],
        expectedOutput: 5,
        isHidden: true
      }
    ],
    hints: [
      'Use a sliding window with two pointers [left, right].',
      'Store character indices to jump the left pointer forward efficiently.'
    ],
    editorial: `### Approach: Sliding Window Optimized
Keep a map of each character and its most recent index. When a duplicate character is encountered inside the current window, shift the left bound to \`charIndex + 1\`.`
  },
  {
    slug: '3sum',
    title: '3Sum',
    difficulty: 'Medium',
    category: 'Algorithms',
    tags: ['Array', 'Two Pointers', 'Sorting'],
    acceptanceRate: 33.8,
    description: `Given an integer array nums, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.

Notice that the solution set must not contain duplicate triplets.`,
    examples: [
      {
        input: 'nums = [-1,0,1,2,-1,-4]',
        output: '[[-1,-1,2],[-1,0,1]]',
        explanation: 'nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0. Distinct triplets are [-1,-1,2] and [-1,0,1].'
      },
      {
        input: 'nums = [0,1,1]',
        output: '[]'
      },
      {
        input: 'nums = [0,0,0]',
        output: '[[0,0,0]]'
      }
    ],
    constraints: [
      '3 <= nums.length <= 3000',
      '-10^5 <= nums[i] <= 10^5'
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function threeSum(nums) {
  // Write your code here
}`,
      python: `class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[[-1,0,1,2,-1,-4]]',
        parsedArgs: [[-1, 0, 1, 2, -1, -4]],
        expectedOutput: [[-1, -1, 2], [-1, 0, 1]],
        isHidden: false
      },
      {
        input: '[[0,1,1]]',
        parsedArgs: [[0, 1, 1]],
        expectedOutput: [],
        isHidden: false
      },
      {
        input: '[[0,0,0]]',
        parsedArgs: [[0, 0, 0]],
        expectedOutput: [[0, 0, 0]],
        isHidden: false
      },
      {
        input: '[[-2,0,1,1,2]]',
        parsedArgs: [[-2, 0, 1, 1, 2]],
        expectedOutput: [[-2, 0, 2], [-2, 1, 1]],
        isHidden: true
      }
    ],
    hints: [
      'Sorting the array helps avoid duplicates and allows two-pointer traversal.',
      'Fix one number, then run two pointers on the remainder.'
    ],
    editorial: `### Approach: Sort + Two Pointers
Sort \`nums\`. For each element \`nums[i]\`, search for pairs \`nums[left] + nums[right] == -nums[i]\` using two pointers moving towards each other. Skip duplicates.`
  },
  {
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    category: 'Algorithms',
    tags: ['Array', 'Two Pointers', 'Greedy'],
    acceptanceRate: 54.8,
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i\`th line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store. Notice that you may not slant the container.`,
    examples: [
      {
        input: 'height = [1,8,6,2,5,4,8,3,7]',
        output: '49',
        explanation: 'The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49.'
      },
      {
        input: 'height = [1,1]',
        output: '1'
      }
    ],
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4'
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
  // Write your code here
}`,
      python: `class Solution:
    def maxArea(self, height: list[int]) -> int:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[[1,8,6,2,5,4,8,3,7]]',
        parsedArgs: [[1, 8, 6, 2, 5, 4, 8, 3, 7]],
        expectedOutput: 49,
        isHidden: false
      },
      {
        input: '[[1,1]]',
        parsedArgs: [[1, 1]],
        expectedOutput: 1,
        isHidden: false
      },
      {
        input: '[[4,3,2,1,4]]',
        parsedArgs: [[4, 3, 2, 1, 4]],
        expectedOutput: 16,
        isHidden: true
      }
    ],
    hints: [
      'Start with the widest container: left = 0, right = n - 1.',
      'Always advance the pointer pointing to the shorter vertical line.'
    ],
    editorial: `### Approach: Two Pointers
The area is limited by the shorter line. Moving the taller line can never increase the area since width shrinks and height cannot exceed the current shorter line. Hence, always move the shorter line.`
  },
  {
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    category: 'Algorithms',
    tags: ['Dynamic Programming', 'Breadth-First Search'],
    acceptanceRate: 43.2,
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return \`-1\`.

You may assume that you have an infinite number of each kind of coin.`,
    examples: [
      {
        input: 'coins = [1,2,5], amount = 11',
        output: '3',
        explanation: '11 = 5 + 5 + 1'
      },
      {
        input: 'coins = [2], amount = 3',
        output: '-1'
      },
      {
        input: 'coins = [1], amount = 0',
        output: '0'
      }
    ],
    constraints: [
      '1 <= coins.length <= 12',
      '1 <= coins[i] <= 2^31 - 1',
      '0 <= amount <= 10^4'
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
function coinChange(coins, amount) {
  // Write your code here
}`,
      python: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[[1,2,5], 11]',
        parsedArgs: [[1, 2, 5], 11],
        expectedOutput: 3,
        isHidden: false
      },
      {
        input: '[[2], 3]',
        parsedArgs: [[2], 3],
        expectedOutput: -1,
        isHidden: false
      },
      {
        input: '[[1], 0]',
        parsedArgs: [[1], 0],
        expectedOutput: 0,
        isHidden: false
      },
      {
        input: '[[186,419,83,408], 6249]',
        parsedArgs: [[186, 419, 83, 408], 6249],
        expectedOutput: 20,
        isHidden: true
      }
    ],
    hints: [
      'Use dynamic programming where dp[i] represents the minimum coins for amount i.',
      'dp[i] = min(dp[i], dp[i - coin] + 1)'
    ],
    editorial: `### Approach: Bottom-Up Dynamic Programming
Define \`dp[i]\` as the fewest coins to make amount \`i\`. Initialize \`dp[0] = 0\` and all other values to infinity. For each amount from 1 to \`amount\`, try each coin.`
  },
  {
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    category: 'Algorithms',
    tags: ['Array', 'Hash Table', 'String', 'Sorting'],
    acceptanceRate: 67.9,
    description: `Given an array of strings \`strs\`, group the anagrams together. You can return the answer in **any order**.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.`,
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]'
      },
      {
        input: 'strs = [""]',
        output: '[[""]]'
      },
      {
        input: 'strs = ["a"]',
        output: '[["a"]]'
      }
    ],
    constraints: [
      '1 <= strs.length <= 10^4',
      '0 <= strs[i].length <= 100',
      'strs[i] consists of lowercase English letters.'
    ],
    starterCode: {
      javascript: `/**
 * @param {string[]} strs
 * @return {string[][]}
 */
function groupAnagrams(strs) {
  // Write your code here
}`,
      python: `class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[["eat","tea","tan","ate","nat","bat"]]',
        parsedArgs: [["eat", "tea", "tan", "ate", "nat", "bat"]],
        expectedOutput: [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
        isHidden: false
      },
      {
        input: '[[""]]',
        parsedArgs: [[""]],
        expectedOutput: [[""]],
        isHidden: false
      },
      {
        input: '[["a"]]',
        parsedArgs: [["a"]],
        expectedOutput: [["a"]],
        isHidden: false
      }
    ],
    hints: [
      'Two strings are anagrams if and only if their sorted strings are identical.'
    ],
    editorial: `### Approach: Categorize by Sorted String
Maintain a map where the key is the sorted string and value is the list of anagrams.`
  },
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    category: 'Algorithms',
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    acceptanceRate: 60.1,
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'The above elevation map (black section) is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water (blue section) are being trapped.'
      },
      {
        input: 'height = [4,2,0,3,2,5]',
        output: '9'
      }
    ],
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5'
    ],
    starterCode: {
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function trap(height) {
  // Write your code here
}`,
      python: `class Solution:
    def trap(self, height: list[int]) -> int:
        # Write your code here
        pass`
    },
    testCases: [
      {
        input: '[[0,1,0,2,1,0,1,3,2,1,2,1]]',
        parsedArgs: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
        expectedOutput: 6,
        isHidden: false
      },
      {
        input: '[[4,2,0,3,2,5]]',
        parsedArgs: [[4, 2, 0, 3, 2, 5]],
        expectedOutput: 9,
        isHidden: false
      },
      {
        input: '[[3,0,2,0,4]]',
        parsedArgs: [[3, 0, 2, 0, 4]],
        expectedOutput: 7,
        isHidden: true
      }
    ],
    hints: [
      'Water trapped above position i is min(max_left, max_right) - height[i].',
      'Use two pointers to track leftMax and rightMax in O(1) space.'
    ],
    editorial: `### Approach: Two Pointers
Instead of storing prefix and suffix maximums in separate arrays, move inward from the boundaries with two pointers.`
  }
];
