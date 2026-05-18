/* Notepad tool types */

export interface NotepadToolState {
  activeNoteId: string | null;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
}

export const DEFAULT_NOTEPAD_STATE: NotepadToolState = {
  activeNoteId: null,
  sidebarWidth: 260,
  sidebarCollapsed: false,
};

export interface NoteItem {
  id: string;
  campaignId: string;
  folderId: string | null;
  title: string;
  contentJson: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFolderItem {
  id: string;
  campaignId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
}
