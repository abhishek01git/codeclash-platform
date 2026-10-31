import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import {
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  BookOpen,
  MessageSquare,
  FileText,
  HelpCircle,
  ThumbsUp,
  Plus,
  ArrowLeft,
  Coins,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProblemDetailPage({ slug, onBack }) {
  const { user, updateCoins, refreshUser } = useAuth();
  const { error: toastError, success: toastSuccess, confirm } = useToast();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Workspace state
  const [leftTab, setLeftTab] = useState('description'); // 'description', 'editorial', 'submissions', 'discussions'
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consoleTab, setConsoleTab] = useState('testcase'); // 'testcase', 'result'
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [showHints, setShowHints] = useState({});

  // Submissions & Discussions
  const [submissions, setSubmissions] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [newDiscTitle, setNewDiscTitle] = useState('');
  const [newDiscContent, setNewDiscContent] = useState('');
  const [showNewDiscModal, setShowNewDiscModal] = useState(false);
  const [viewingSubmissionCode, setViewingSubmissionCode] = useState(null);

  // Fetch Problem
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.getProblemBySlug(slug);
        setProblem(data.problem);

        // Restore the user's most recent accepted solution when they revisit a
        // problem. Fall back to the empty starter template for new problems.
        try {
          const submissionData = await api.getProblemSubmissions(slug);
          const acceptedSubmission = submissionData.submissions?.find(
            (submission) => submission.status === 'Accepted' && submission.code
          );

          if (acceptedSubmission) {
            const savedLanguage = acceptedSubmission.language || 'javascript';
            setLanguage(savedLanguage);
            setCode(acceptedSubmission.code);
          } else {
            setCode(data.problem.starterCode?.[language] || data.problem.starterCode?.javascript || '');
          }
        } catch (submissionError) {
          // The editor should still work even if submission history cannot load.
          setCode(data.problem.starterCode?.[language] || data.problem.starterCode?.javascript || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Update starter code when language changes
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (problem?.starterCode?.[newLang]) {
      setCode(problem.starterCode[newLang]);
    }
  };

  const handleResetCode = async () => {
    const ok = await confirm({
      title: 'Reset Starter Code',
      message: 'Are you sure you want to reset your code to the default template? Your current edits will be lost.',
      confirmText: 'Reset Code',
      cancelText: 'Keep Editing',
      type: 'warning'
    });
    if (ok) {
      setCode(problem?.starterCode?.[language] || '');
      toastSuccess('Code reset to default starter template');
    }
  };

  // Run Code
  const handleRunCode = async () => {
    setIsRunning(true);
    setConsoleTab('result');
    try {
      const data = await api.runCode(slug, { code, language });
      setRunResult(data.result);
      setSubmitResult(null);
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        error: err.message,
        passedTestCases: 0,
        totalTestCases: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setConsoleTab('result');
    try {
      const data = await api.submitCode(slug, { code, language });
      setSubmitResult(data);
      setRunResult(data.result);

      if (data.result.status === 'Accepted') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        if (data.coinsAwarded > 0) {
          updateCoins(data.userCoins);
        }
        await refreshUser();
      }
      loadSubmissions();
    } catch (err) {
      toastError(err.message || 'Error submitting solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load Submissions
  const loadSubmissions = async () => {
    try {
      const data = await api.getProblemSubmissions(slug);
      setSubmissions(data.submissions || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Discussions
  const loadDiscussions = async () => {
    try {
      const data = await api.getProblemDiscussions(slug);
      setDiscussions(data.discussions || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (leftTab === 'submissions') loadSubmissions();
    if (leftTab === 'discussions') loadDiscussions();
  }, [leftTab]);

  const handlePostDiscussion = async (e) => {
    e.preventDefault();
    if (!newDiscTitle || !newDiscContent) return;
    try {
      const res = await api.createDiscussion(slug, {
        title: newDiscTitle,
        content: newDiscContent,
        tags: [language === 'javascript' ? 'JavaScript' : 'Python', 'Solution']
      });
      toastSuccess(`Solution posted! +${res.coinsEarned} Coins earned! 🪙`);
      setNewDiscTitle('');
      setNewDiscContent('');
      setShowNewDiscModal(false);
      loadDiscussions();
      await refreshUser();
    } catch (err) {
      toastError(err.message || 'Error posting discussion');
    }
  };

  const handleUpvote = async (discId) => {
    try {
      await api.upvoteDiscussion(discId);
      loadDiscussions();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mr-3" />
        Loading problem environment...
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">Problem not found.</p>
        <button onClick={onBack} className="px-4 py-2 bg-[#21262d] text-white rounded-lg">
          Back to Problems
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-61px)] flex flex-col bg-[#0d1117] overflow-hidden">
      {/* Sub-header Bar */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition px-2 py-1 rounded bg-[#21262d] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-white text-sm">{problem.title}</h1>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                problem.difficulty === 'Easy'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : problem.difficulty === 'Medium'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {problem.difficulty}
            </span>
            {user?.solvedProblems?.includes(problem.slug) && (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" /> Solved
              </span>
            )}
          </div>
        </div>

        {/* Center Run & Submit Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-gray-200 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={handleSubmitCode}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Evaluating...' : 'Submit'}
          </button>
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-3 text-gray-400">
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <Coins className="w-3.5 h-3.5 fill-amber-400" />
            Reward: +{problem.difficulty === 'Easy' ? 25 : problem.difficulty === 'Medium' ? 50 : 100} Coins
          </span>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Tabs (Description, Editorial, Submissions, Discussions) */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-[#30363d] bg-[#0d1117] overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex items-center bg-[#161b22] border-b border-[#30363d] px-2 text-xs">
            <button
              onClick={() => setLeftTab('description')}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                leftTab === 'description'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Description
            </button>
            <button
              onClick={() => setLeftTab('editorial')}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                leftTab === 'editorial'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Editorial
            </button>
            <button
              onClick={() => setLeftTab('submissions')}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                leftTab === 'submissions'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Submissions
            </button>
            <button
              onClick={() => setLeftTab('discussions')}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
                leftTab === 'discussions'
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Solutions & Discussions
            </button>
          </div>

          {/* Left Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-300">
            {leftTab === 'description' && (
              <>
                {/* Description Text */}
                <div className="prose prose-invert max-w-none space-y-4">
                  <div className="whitespace-pre-line text-gray-200 leading-relaxed font-sans">
                    {problem.description}
                  </div>
                </div>

                {/* Examples */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-white text-sm">Examples:</h3>
                  {problem.examples?.map((ex, idx) => (
                    <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 space-y-2 text-xs font-mono">
                      <div className="text-gray-400 font-bold uppercase text-[10px]">Example {idx + 1}:</div>
                      <div>
                        <span className="text-gray-400 font-semibold">Input: </span>
                        <span className="text-amber-300">{ex.input}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold">Output: </span>
                        <span className="text-emerald-400">{ex.output}</span>
                      </div>
                      {ex.explanation && (
                        <div className="font-sans text-gray-300 pt-1 border-t border-[#21262d]">
                          <span className="text-gray-400 font-semibold">Explanation: </span>
                          {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="space-y-2 pt-2">
                  <h3 className="font-bold text-white text-sm">Constraints:</h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-400 font-mono">
                    {problem.constraints?.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Hints */}
                {problem.hints && problem.hints.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-amber-400" /> Hints:
                    </h3>
                    {problem.hints.map((hint, idx) => {
                      const isOpen = showHints[idx];
                      return (
                        <div key={idx} className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                          <button
                            onClick={() => setShowHints(p => ({ ...p, [idx]: !p[idx] }))}
                            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-300 hover:text-white transition"
                          >
                            <span>Hint {idx + 1}</span>
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          {isOpen && (
                            <div className="p-3 pt-0 text-xs text-gray-400 border-t border-[#21262d]">
                              {hint}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {leftTab === 'editorial' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Official Editorial Solution</h2>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-xs text-gray-300 whitespace-pre-line leading-relaxed font-sans">
                  {problem.editorial || 'Editorial is currently being drafted by the community.'}
                </div>
              </div>
            )}

            {leftTab === 'submissions' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white">Your Past Submissions</h2>
                {submissions.length === 0 ? (
                  <p className="text-xs text-gray-400">No submissions yet for this problem.</p>
                ) : (
                  <div className="space-y-2">
                    {submissions.map((sub) => (
                      <div
                        key={sub._id}
                        className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {sub.status === 'Accepted' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          )}
                          <div>
                            <span className={`font-bold ${sub.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {sub.status}
                            </span>
                            <div className="text-[11px] text-gray-400">
                              {new Date(sub.createdAt).toLocaleDateString()} at {new Date(sub.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-gray-300">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-gray-400" /> {sub.runtime} ms
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Cpu className="w-3.5 h-3.5 text-gray-400" /> {sub.memory} MB
                          </span>
                          <button
                            onClick={() => setViewingSubmissionCode(sub.code)}
                            className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-200 rounded font-semibold text-[11px]"
                          >
                            View Code
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {leftTab === 'discussions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Community Solutions</h2>
                  <button
                    onClick={() => setShowNewDiscModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Post Solution (+10 Coins)
                  </button>
                </div>

                <div className="space-y-3">
                  {discussions.map((disc) => (
                    <div key={disc._id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img src={disc.authorAvatar} alt="" className="w-6 h-6 rounded-full" />
                          <span className="font-semibold text-xs text-gray-200">{disc.authorName}</span>
                          <span className="text-[11px] text-gray-500">
                            {new Date(disc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUpvote(disc._id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] text-gray-300 hover:text-amber-400 text-xs font-semibold cursor-pointer"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> {disc.upvotes?.length || 0}
                        </button>
                      </div>

                      <h4 className="font-bold text-sm text-white">{disc.title}</h4>
                      <div className="bg-[#0d1117] p-3 rounded-lg text-xs font-mono text-gray-300 whitespace-pre-wrap">
                        {disc.content}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {disc.tags?.map((t) => (
                          <span key={t} className="px-2 py-0.5 bg-[#21262d] text-gray-400 text-[10px] rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor & Console */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#161b22] overflow-hidden">
          {/* Editor Header */}
          <div className="bg-[#161b22] border-b border-[#30363d] px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider">Language:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] text-gray-200 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="javascript">JavaScript (ES6)</option>
                <option value="python">Python 3</option>
              </select>
            </div>

            <button
              onClick={handleResetCode}
              title="Reset code to original starter template"
              className="flex items-center gap-1 text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-[#21262d] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 relative min-h-[300px]">
            <Editor
              height="100%"
              language={language === 'javascript' ? 'javascript' : 'python'}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Consolas, "Fira Code", monospace',
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true
              }}
            />
          </div>

          {/* Bottom Console / Test Results Panel */}
          <div className="h-60 border-t border-[#30363d] bg-[#0d1117] flex flex-col">
            {/* Console Tab Bar */}
            <div className="bg-[#161b22] border-b border-[#30363d] px-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConsoleTab('testcase')}
                  className={`px-3 py-1.5 font-semibold border-b-2 cursor-pointer ${
                    consoleTab === 'testcase'
                      ? 'border-amber-400 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Test Cases
                </button>
                <button
                  onClick={() => setConsoleTab('result')}
                  className={`px-3 py-1.5 font-semibold border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    consoleTab === 'result'
                      ? 'border-amber-400 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Test Result
                  {runResult && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        runResult.status === 'Accepted' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                  )}
                </button>
              </div>

              {runResult && (
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" /> {runResult.runtime} ms
                  </span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <Cpu className="w-3 h-3" /> {runResult.memory} MB
                  </span>
                </div>
              )}
            </div>

            {/* Console Body */}
            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
              {consoleTab === 'testcase' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {problem.testCases?.map((tc, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveTestCaseIndex(idx)}
                        className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          activeTestCaseIndex === idx
                            ? 'bg-[#30363d] text-white border border-gray-500'
                            : 'bg-[#161b22] text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {problem.testCases?.[activeTestCaseIndex] && (
                    <div className="space-y-2 bg-[#161b22] p-3 rounded-xl border border-[#30363d]">
                      <div>
                        <span className="text-gray-400 font-semibold block mb-1">Input:</span>
                        <div className="bg-[#0d1117] p-2 rounded text-amber-300">
                          {problem.testCases[activeTestCaseIndex].input}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block mb-1">Expected Output:</span>
                        <div className="bg-[#0d1117] p-2 rounded text-emerald-400">
                          {JSON.stringify(problem.testCases[activeTestCaseIndex].expectedOutput)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {consoleTab === 'result' && (
                <div>
                  {!runResult ? (
                    <div className="text-gray-500 py-6 text-center">
                      Click "Run" to test your solution or "Submit" to evaluate against all test cases.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Status Banner */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {runResult.status === 'Accepted' ? (
                            <span className="text-base font-extrabold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-5 h-5" /> Accepted
                            </span>
                          ) : (
                            <span className="text-base font-extrabold text-rose-400 flex items-center gap-1.5">
                              <XCircle className="w-5 h-5" /> {runResult.status}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            ({runResult.passedTestCases} / {runResult.totalTestCases} test cases passed)
                          </span>
                        </div>

                        {submitResult?.coinsAwarded > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 font-extrabold text-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            +{submitResult.coinsAwarded} Coins Earned!
                          </div>
                        )}
                      </div>

                      {/* Error or failed testcase details */}
                      {runResult.error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 font-mono text-[11px] whitespace-pre-wrap">
                          {runResult.error}
                        </div>
                      )}

                      {runResult.failedTestCase && (
                        <div className="bg-[#161b22] border border-rose-500/30 rounded-xl p-3 space-y-2 text-xs">
                          <div className="text-rose-400 font-bold">First Failed Test Case:</div>
                          <div>
                            <span className="text-gray-400">Input: </span>
                            <span className="text-amber-300">{runResult.failedTestCase.input}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Expected: </span>
                            <span className="text-emerald-400">{JSON.stringify(runResult.failedTestCase.expected)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Your Output: </span>
                            <span className="text-rose-300">{JSON.stringify(runResult.failedTestCase.actual)}</span>
                          </div>
                          {runResult.failedTestCase.stdout && (
                            <div>
                              <span className="text-gray-400">Console stdout: </span>
                              <pre className="text-gray-300 bg-[#0d1117] p-2 rounded mt-1">{runResult.failedTestCase.stdout}</pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Individual testcase results */}
                      {runResult.results && runResult.results.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {runResult.results.map((r, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              }`}
                            >
                              Case {i + 1}: {r.passed ? 'Pass' : 'Fail'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Discussion Modal */}
      {showNewDiscModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-lg text-white">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Post Your Solution & Explanation
            </h3>
            <form onSubmit={handlePostDiscussion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Clean O(N) Hash Map solution with detailed breakdown"
                  value={newDiscTitle}
                  onChange={(e) => setNewDiscTitle(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Explanation & Code</label>
                <textarea
                  rows="6"
                  placeholder="Explain your thought process, time/space complexity, and code snippet..."
                  value={newDiscContent}
                  onChange={(e) => setNewDiscContent(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Coins className="w-4 h-4" /> Earn +10 Coins on submit!
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewDiscModal(false)}
                    className="px-4 py-2 bg-[#21262d] text-gray-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold"
                  >
                    Publish
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Past Submission Code Modal */}
      {viewingSubmissionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-2xl text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Submitted Code</h3>
              <button
                onClick={() => setViewingSubmissionCode(null)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-[#21262d]"
              >
                Close
              </button>
            </div>
            <pre className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-[60vh] text-emerald-300">
              {viewingSubmissionCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
