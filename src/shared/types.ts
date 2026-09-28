export interface Game {
	id: number;
	name: string;
	year?: number;
	imageId: string;
}

export interface Grid {
	title: string;
	subtitle: string;
	slots: (Game | null)[];
}

export const LIMITS = { title: 60, subtitle: 100, name: 200 } as const;
