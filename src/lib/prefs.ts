/**
 * The template a user last chose, kept per browser. Every access is guarded: storage
 * throws in private windows and comes back empty after a clear, and neither should
 * stop the editor loading.
 */
const KEY = 'fss.template';

export function readTemplatePref(): string {
	try {
		return localStorage.getItem(KEY) ?? '';
	} catch {
		return '';
	}
}

export function writeTemplatePref(id: string) {
	try {
		localStorage.setItem(KEY, id);
	} catch {
		// a viewer who blocks storage just gets the default template each visit
	}
}
