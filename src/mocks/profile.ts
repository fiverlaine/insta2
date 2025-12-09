export interface Post {
  id: string;
  images: string[];
  likes: number;
  caption: string;
  date: string;
}

export interface Profile {
  username: string;
  name: string;
  avatar: string;
  posts: number;
  followers: number;
  following: number;
  bio: string[];
  link: string;
  isFollowing: boolean;
}

export const profileData: Profile = {
  username: "pedroomonteeiroo__",
  name: "Pedro Monteiro",
  avatar: "/assets/images/profile.jpg",
  posts: 3,
  followers: 234000,
  following: 27,
  bio: [
    "CONTA NOVA ❗",
    "Multimilionário aos 23 anos🛬",
    "Menos rotina,mais grana😎",
  ],
  link: "codenexus1.netlify.app",
  isFollowing: false,
};

export const postsData: Post[] = [
  {
    id: "1",
    images: [
      "/assets/images/post1.jpg",
    ],
    likes: 1098,
    caption: "Sempre foi um sonho ter uma dessa, aquele menino que era desacreditado pela família, chamado de louco, acabou de comprar uma lambo porra! Nunca desacredite do seu sonho🤙💰",
    date: "8 de outubro",
  },
  {
    id: "2",
    images: [
      "/assets/images/post2.jpg",
    ],
    likes: 856,
    caption: "Vivendo o sonho ✈️",
    date: "5 de outubro",
  },
  {
    id: "3",
    images: [
      "/assets/images/post3.jpg",
    ],
    likes: 1432,
    caption: "Vista perfeita 🌅",
    date: "1 de outubro",
  },
];

