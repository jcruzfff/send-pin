import { create } from 'zustand';

interface UploadingPost {
  id: string;
  progress: number;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  spot: {
    id: string;
    name: string;
    location: string;
  };
  trick: string;
}

interface UploadStore {
  uploadingPosts: UploadingPost[];
  addUploadingPost: (post: UploadingPost) => void;
  updateProgress: (id: string, progress: number) => void;
  removeUploadingPost: (id: string) => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  uploadingPosts: [],
  addUploadingPost: (post) => 
    set((state) => ({
      uploadingPosts: [...state.uploadingPosts, post]
    })),
  updateProgress: (id, progress) =>
    set((state) => ({
      uploadingPosts: state.uploadingPosts.map((post) =>
        post.id === id ? { ...post, progress } : post
      )
    })),
  removeUploadingPost: (id) =>
    set((state) => ({
      uploadingPosts: state.uploadingPosts.filter((post) => post.id !== id)
    })),
})); 