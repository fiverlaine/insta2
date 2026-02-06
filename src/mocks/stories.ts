export interface Story {
  id: string;
  media: string;
  type: 'image' | 'video';
  duration: number;
}

export const storiesData: Story[] = [
  {
    id: "1",
    media: "/assets/images/post1.jpg",
    type: "image",
    duration: 5000,
  },
  {
    id: "2",
    media: "/assets/images/profile.jpg",
    type: "image",
    duration: 5000,
  },
];

