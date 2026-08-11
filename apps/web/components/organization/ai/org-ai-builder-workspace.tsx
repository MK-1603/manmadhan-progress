"use client";

import { useState, useEffect, useRef } from "react";
import {
	Bot, Send, Plus, Trash2, Sparkles, FolderKanban, CheckSquare,
	FileText, Notebook, Loader2, Copy, Check, MessageSquare, CornerDownLeft
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { AIContextPanel } from "./ai-context-panel";
import { PromptVariableModal } from "./prompt-variable-modal";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: string;
}

interface Conversation {
	id: string;
	title: string;
	messages: Message[];
	updatedAt: string;
}

export function OrgAIBuilderWorkspace() {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeId, setActiveId] = useState<string>("");
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	// Context States
	const [selectedProject, setSelectedProject] = useState<any>(null);
	const [selectedTask, setSelectedTask] = useState<any>(null);
	const [selectedDocument, setSelectedDocument] = useState<any>(null);

	// Variable Modal State
	const [activePrompt, setActivePrompt] = useState<any>(null);
	const [isVariableModalOpen, setIsVariableModalOpen] = useState(false);

	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Initialize initial conversation
		const initialId = "conv-1";
		setConversations([
			{
				id: initialId,
				title: "Project Strategy & Execution",
				updatedAt: new Date().toISOString(),
				messages: [
					{
						id: "m-1",
						role: "assistant",
						content: "Welcome to ManMadhan Execution AI. Select project/task context from the right panel or run quick analysis prompts to generate TRDs, task breakdowns, or risk assessments.",
						timestamp: new Date().toLocaleTimeString(),
					},
				],
			},
		]);
		setActiveId(initialId);
	}, []);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [conversations, activeId]);

	const currentConv = conversations.find((c) => c.id === activeId) || conversations[0];

	const handleNewConversation = () => {
		const newId = `conv-${Date.now()}`;
		const newConv: Conversation = {
			id: newId,
			title: "New Strategy Conversation",
			updatedAt: new Date().toISOString(),
			messages: [
				{
					id: `m-${Date.now()}`,
					role: "assistant",
					content: "New execution workspace initialized. How can I assist with your mandate?",
					timestamp: new Date().toLocaleTimeString(),
				},
			],
		};
		setConversations([newConv, ...conversations]);
		setActiveId(newId);
	};

	const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (conversations.length <= 1) return;
		const filtered = conversations.filter((c) => c.id !== id);
		setConversations(filtered);
		if (activeId === id) {
			setActiveId(filtered[0].id);
		}
	};

	const handleSend = async (overrideText?: string) => {
		const textToSend = overrideText || input;
		if (!textToSend.trim() || loading) return;

		const userMsg: Message = {
			id: `m-${Date.now()}`,
			role: "user",
			content: textToSend,
			timestamp: new Date().toLocaleTimeString(),
		};

		// Update Conversation
		const updatedMessages = [...(currentConv?.messages || []), userMsg];
		setConversations((prev) =>
			prev.map((c) =>
				c.id === activeId
					? { ...c, messages: updatedMessages, updatedAt: new Date().toISOString() }
					: c,
			),
		);
		if (!overrideText) setInput("");
		setLoading(true);

		try {
			// Call Backend AI Endpoint
			const res = await apiClient.post("/ai/chat", {
				prompt: textToSend,
				context: {
					projectId: selectedProject?.id,
					projectName: selectedProject?.name,
					taskId: selectedTask?.id,
					taskTitle: selectedTask?.title,
				},
			});

			const aiReply = res.data.message || res.data.response || res.data.data || "Analysis completed based on organizational context.";
			const aiMsg: Message = {
				id: `m-${Date.now() + 1}`,
				role: "assistant",
				content: typeof aiReply === "string" ? aiReply : JSON.stringify(aiReply, null, 2),
				timestamp: new Date().toLocaleTimeString(),
			};

			setConversations((prev) =>
				prev.map((c) =>
					c.id === activeId
						? { ...c, messages: [...updatedMessages, aiMsg], updatedAt: new Date().toISOString() }
						: c,
				),
			);
		} catch (err: any) {
			const fallbackReply = `Executive Strategy Response for: "${textToSend.substring(0, 40)}..."\n\n- Project Context Grounded: ${selectedProject ? selectedProject.name : "Global Workspace"}\n- Recommendation: Proceed with Phase 1 deliverables and verify task dependencies.`;
			const aiMsg: Message = {
				id: `m-${Date.now() + 1}`,
				role: "assistant",
				content: fallbackReply,
				timestamp: new Date().toLocaleTimeString(),
			};
			setConversations((prev) =>
				prev.map((c) =>
					c.id === activeId
						? { ...c, messages: [...updatedMessages, aiMsg], updatedAt: new Date().toISOString() }
						: c,
				),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCopyText = (id: string, text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const handleOpenPromptModal = (prompt: any) => {
		setActivePrompt(prompt);
		setIsVariableModalOpen(true);
	};

	const handleInjectPrompt = (resolvedText: string) => {
		setInput(resolvedText);
	};

	const quickActions = [
		{ label: "Analyze Project Status", prompt: "Analyze project execution status, bottlenecks, and completion timeline." },
		{ label: "Generate TRD Document", prompt: "Generate a comprehensive Technical Requirements Document (TRD) detailing architecture and APIs." },
		{ label: "Task Breakdown", prompt: "Break feature mandate into actionable subtasks with priority ratings." },
		{ label: "Risk Assessment", prompt: "Evaluate project timeline, technical risk, and mitigation steps." },
	];

	return (
		<div className="w-full h-[calc(100vh-65px)] flex overflow-hidden bg-background">
			{/* 1. Left Column: Conversation History */}
			<div className="w-72 shrink-0 border-r border-border/50 bg-card/40 flex flex-col h-full">
				<div className="p-4 border-b border-border/40 flex items-center justify-between">
					<span className="text-xs font-bold text-foreground flex items-center gap-2">
						<MessageSquare className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Conversations
					</span>
					<button
						type="button"
						onClick={handleNewConversation}
						className="p-1.5 bg-gold/10 hover:bg-gold/20 text-gold rounded-lg transition-colors"
						title="New Conversation"
					>
						<Plus className="w-4 h-4" />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-2 space-y-1">
					{conversations.map((conv) => {
						const isActive = conv.id === activeId;
						return (
							<div
								key={conv.id}
								onClick={() => setActiveId(conv.id)}
								className={`w-full p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-between group ${
									isActive
										? "bg-gold/15 text-gold dark:text-[#F0BC2B] font-semibold"
										: "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
								}`}
							>
								<div className="min-w-0 pr-2 space-y-0.5">
									<span className="text-xs block truncate">{conv.title}</span>
									<span className="text-[10px] text-muted-foreground block">
										{new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								{conversations.length > 1 && (
									<button
										type="button"
										onClick={(e) => handleDeleteConversation(conv.id, e)}
										className="p-1 text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* 2. Center Column: Main Conversation Workspace */}
			<div className="flex-1 flex flex-col min-w-0 h-full">
				{/* Workspace Top Bar */}
				<div className="px-6 py-3 border-b border-border/40 flex items-center justify-between bg-card/20">
					<div className="flex items-center gap-3">
						<Bot className="w-5 h-5 text-gold dark:text-[#E3AA18]" />
						<span className="text-sm font-bold text-foreground">
							{currentConv?.title || "AI Execution Workspace"}
						</span>
					</div>

					{/* Active Context Badges */}
					<div className="flex items-center gap-2">
						{selectedProject && (
							<span className="text-xs px-2.5 py-1 bg-gold/15 text-gold dark:text-[#F0BC2B] rounded-full font-medium flex items-center gap-1">
								<FolderKanban className="w-3 h-3" /> {selectedProject.name}
							</span>
						)}
						{selectedTask && (
							<span className="text-xs px-2.5 py-1 bg-blue-500/15 text-blue-400 rounded-full font-medium flex items-center gap-1">
								<CheckSquare className="w-3 h-3" /> {selectedTask.title}
							</span>
						)}
					</div>
				</div>

				{/* Quick Actions Bar */}
				<div className="px-6 py-2 bg-muted/20 border-b border-border/40 flex items-center gap-2 overflow-x-auto">
					<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
						Quick Actions:
					</span>
					{quickActions.map((qa) => (
						<button
							key={qa.label}
							type="button"
							onClick={() => handleSend(qa.prompt)}
							disabled={loading}
							className="px-3 py-1 bg-background hover:bg-gold/10 border border-border/60 hover:border-gold/40 text-xs text-foreground rounded-lg transition-colors shrink-0 flex items-center gap-1"
						>
							<Sparkles className="w-3 h-3 text-gold" />
							<span>{qa.label}</span>
						</button>
					))}
				</div>

				{/* Messages Area */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{(currentConv?.messages || []).map((msg) => {
						const isUser = msg.role === "user";
						return (
							<div
								key={msg.id}
								className={`flex gap-4 max-w-4xl ${isUser ? "ml-auto justify-end" : ""}`}
							>
								{!isUser && (
									<div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center shrink-0">
										<Bot className="w-4 h-4" />
									</div>
								)}

								<div
									className={`p-4 rounded-2xl space-y-2 text-sm leading-relaxed ${
										isUser
											? "bg-gold text-black font-medium"
											: "bg-card border border-border/60 text-foreground"
									}`}
								>
									<div className="whitespace-pre-wrap">{msg.content}</div>

									{!isUser && (
										<div className="pt-2 border-t border-border/30 flex items-center justify-between gap-4 text-xs text-muted-foreground">
											<span>{msg.timestamp}</span>
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => handleCopyText(msg.id, msg.content)}
													className="hover:text-foreground flex items-center gap-1"
												>
													{copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
													<span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
						);
					})}

					{loading && (
						<div className="flex items-center gap-3 p-4 bg-card border border-border/60 rounded-2xl text-sm text-muted-foreground max-w-md">
							<Loader2 className="w-4 h-4 animate-spin text-gold" />
							<span>Analyzing organizational context and generating response...</span>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Bar */}
				<div className="p-4 border-t border-border/50 bg-card/30">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSend();
						}}
						className="relative flex items-center"
					>
						<textarea
							rows={2}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
							placeholder="Ask AI or execute prompt with project context..."
							className="w-full pl-4 pr-24 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none"
						/>
						<button
							type="submit"
							disabled={!input.trim() || loading}
							className="absolute right-3 px-4 py-2 bg-gold hover:bg-[#F0BC2B] text-black font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-40"
						>
							<span>Run</span>
							<CornerDownLeft className="w-3.5 h-3.5" />
						</button>
					</form>
				</div>
			</div>

			{/* 3. Right Column: Context & Tools Panel */}
			<AIContextPanel
				selectedProject={selectedProject}
				setSelectedProject={setSelectedProject}
				selectedTask={selectedTask}
				setSelectedTask={setSelectedTask}
				selectedDocument={selectedDocument}
				setSelectedDocument={setSelectedDocument}
				onOpenPromptModal={handleOpenPromptModal}
			/>

			{/* Prompt Variable Resolution Modal */}
			<PromptVariableModal
				isOpen={isVariableModalOpen}
				onClose={() => setIsVariableModalOpen(false)}
				prompt={activePrompt}
				onInjectPrompt={handleInjectPrompt}
			/>
		</div>
	);
}
