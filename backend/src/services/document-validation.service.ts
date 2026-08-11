export interface ValidationResult {
	isValid: boolean;
	wordCount: number;
	maxWordLimit: number;
	missingSections: string[];
	consistencyErrors: string[];
	warnings: string[];
}

export class DocumentValidationService {
	private static REQUIRED_SECTIONS: Record<string, string[]> = {
		PRD: [
			"Problem Statement",
			"Objectives",
			"Target Users & Roles",
			"Functional Requirements",
			"Non-functional Requirements",
			"User Stories",
			"Scope & Out of Scope",
			"Success Criteria",
		],
		TRD: [
			"System Architecture",
			"Technology Stack",
			"Frontend Specifications",
			"Backend Specifications",
			"API Endpoints",
			"Database Schema",
			"Security & RBAC",
			"Deployment Strategy",
		],
		WORKFLOW: [
			"User Journeys",
			"System State Flow",
			"Role Interaction Model",
			"Approval State Transitions",
			"Error & Edge Case Handling",
		],
		UIUX_BRIEF: [
			"Design Objectives",
			"Information Architecture",
			"Screen Inventory",
			"Responsive Behavior",
			"Design Tokens & Color Palette",
			"Component Inventory",
		],
		DATABASE_PLAN: [
			"Entity Models",
			"Data Types & Nullability",
			"Primary & Foreign Keys",
			"Schema Isolation Strategy",
			"Indices & Constraints",
		],
		IMPLEMENTATION_PLAN: [
			"Phase 1 Foundation",
			"Phase 2 Backend & Database",
			"Phase 3 Frontend Implementation",
			"Phase 4 Integration & Workflows",
			"Phase 5 Testing & Deployment",
		],
	};

	private static MAX_WORD_LIMITS: Record<string, number> = {
		PRD: 6000,
		TRD: 6000,
		WORKFLOW: 4000,
		UIUX_BRIEF: 4000,
		DATABASE_PLAN: 4000,
		IMPLEMENTATION_PLAN: 5000,
	};

	/**
	 * Validates document content for required section headers and length limits
	 */
	static validateDocument(documentType: string, content: string): ValidationResult {
		const text = content || "";
		const words = text.trim() ? text.trim().split(/\s+/).length : 0;
		const maxLimit = this.MAX_WORD_LIMITS[documentType] || 6000;
		const required = this.REQUIRED_SECTIONS[documentType] || [];

		const missingSections: string[] = [];
		const contentLower = text.toLowerCase();

		for (const section of required) {
			const sectionLower = section.toLowerCase();
			if (!contentLower.includes(sectionLower)) {
				missingSections.push(section);
			}
		}

		const consistencyErrors: string[] = [];
		const warnings: string[] = [];

		if (words > maxLimit) {
			consistencyErrors.push(`Document word count (${words} words) exceeds max allowed limit of ${maxLimit} words.`);
		}

		if (words < 100) {
			missingSections.push("Comprehensive Details (Min 100 words required)");
		}

		return {
			isValid: missingSections.length === 0 && consistencyErrors.length === 0,
			wordCount: words,
			maxWordLimit: maxLimit,
			missingSections,
			consistencyErrors,
			warnings,
		};
	}

	/**
	 * Performs cross-document consistency verification between PRD, TRD and Database Plan
	 */
	static verifyCrossDocumentConsistency(prdContent: string, trdContent: string, dbContent?: string): string[] {
		const errors: string[] = [];
		const prdLower = (prdContent || "").toLowerCase();
		const trdLower = (trdContent || "").toLowerCase();

		// Role Consistency Check
		if (prdLower.includes("co-ceo") && !trdLower.includes("co-ceo") && !trdLower.includes("rbac")) {
			errors.push("Role Consistency Conflict: PRD specifies CO-CEO role, but TRD lacks RBAC or CO-CEO specification.");
		}

		// Security Isolation Check
		if (prdLower.includes("personal workspace") && !trdLower.includes("isolation")) {
			errors.push("Security Boundary Warning: PRD specifies Personal Workspace, but TRD does not specify workspace isolation.");
		}

		return errors;
	}
}
