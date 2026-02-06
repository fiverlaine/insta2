export interface Comment {
  id: string;
  postId: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  text: string;
  likes: number;
  timeAgo: string;
  replies?: Comment[];
}

// Comentários fake para cada post
export const fakeComments: { [postId: string]: Comment[] } = {
  // Post 1
  'post-1': [
    {
      id: 'c1',
      postId: 'post-1',
      username: 'jaobastos',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      isVerified: true,
      text: 'Gostaram do nosso substituto? #substituição #lca #liga x1',
      likes: 234,
      timeAgo: '3 h',
      replies: []
    },
    {
      id: 'c2',
      postId: 'post-1',
      username: 'vanessabastosmae',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      isVerified: true,
      text: 'Nossa que triste !! Eu estava c muita fé nele 😢 @cauasouza_',
      likes: 6,
      timeAgo: '3 h',
      replies: []
    },
    {
      id: 'c3',
      postId: 'post-1',
      username: 'lukebastos',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      isVerified: true,
      text: 'BORAAAAA @futblack_ 🔥🔥🔥',
      likes: 7,
      timeAgo: '2 h',
      replies: [
        {
          id: 'c3-r1',
          postId: 'post-1',
          username: 'futblack_',
          avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
          isVerified: true,
          text: 'Bora juntos ganhar essa parada, irmão! ❤️🔥',
          likes: 35,
          timeAgo: '3 h',
          replies: []
        }
      ]
    },
    {
      id: 'c4',
      postId: 'post-1',
      username: 'henryjapa7',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
      isVerified: true,
      text: 'Será q agora vai? Ou até domingo aparece outro? 🤔😂',
      likes: 18,
      timeAgo: '3 h',
      replies: [
        {
          id: 'c4-r1',
          postId: 'post-1',
          username: 'marcosilva',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
          isVerified: false,
          text: 'Kkkkkkk boa 😂',
          likes: 2,
          timeAgo: '2 h',
          replies: []
        },
        {
          id: 'c4-r2',
          postId: 'post-1',
          username: 'anacarolina',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
          isVerified: false,
          text: 'Até domingo tem mais história 😅',
          likes: 1,
          timeAgo: '2 h',
          replies: []
        }
      ]
    }
  ],

  // Post 2
  'post-2': [
    {
      id: 'c5',
      postId: 'post-2',
      username: 'pedromonteeiro__',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
      isVerified: true,
      text: 'Sempre foi um sonho ter uma dessa, aquele menino que era desacreditado pela família, chamado de louco, acabou de comprar uma lambo porra! Nunca desacredite do seu sonho 💪💰',
      likes: 1127,
      timeAgo: '8 de outubro',
      replies: []
    },
    {
      id: 'c6',
      postId: 'post-2',
      username: 'carlosmendes',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
      isVerified: false,
      text: 'Mereceu demais mano! 🔥🔥',
      likes: 45,
      timeAgo: '8 de outubro',
      replies: []
    },
    {
      id: 'c7',
      postId: 'post-2',
      username: 'juliaferreira',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      isVerified: true,
      text: 'Inspiração pura! Parabéns 🎉',
      likes: 23,
      timeAgo: '8 de outubro',
      replies: [
        {
          id: 'c7-r1',
          postId: 'post-2',
          username: 'pedromonteeiro__',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
          isVerified: true,
          text: 'Obrigado! 🙏',
          likes: 5,
          timeAgo: '8 de outubro',
          replies: []
        }
      ]
    }
  ],

  // Post 3
  'post-3': [
    {
      id: 'c8',
      postId: 'post-3',
      username: 'mariaeduarda',
      avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop',
      isVerified: false,
      text: 'Que foto incrível! 😍',
      likes: 12,
      timeAgo: '1 dia',
      replies: []
    },
    {
      id: 'c9',
      postId: 'post-3',
      username: 'rafaelsantos',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
      isVerified: true,
      text: 'Perfeito demais! 🔥',
      likes: 8,
      timeAgo: '1 dia',
      replies: []
    }
  ]
};

// Função helper para obter comentários de um post (incluindo localStorage)
export const getCommentsForPost = (postId: string): Comment[] => {
  // Primeiro tenta pegar do localStorage
  try {
    const stored = localStorage.getItem('fakeComments');
    if (stored) {
      const allComments = JSON.parse(stored);
      if (allComments[postId]) {
        return allComments[postId];
      }
    }
  } catch (error) {
    console.error('Erro ao carregar comentários do localStorage:', error);
  }
  
  // Se não encontrou no localStorage, usa os comentários fake padrão
  return fakeComments[postId] || [];
};

// Função helper para contar total de comentários (incluindo respostas)
export const countTotalComments = (postId: string): number => {
  const comments = getCommentsForPost(postId);
  let total = comments.length;
  
  comments.forEach(comment => {
    if (comment.replies && comment.replies.length > 0) {
      total += comment.replies.length;
    }
  });
  
  return total;
};

