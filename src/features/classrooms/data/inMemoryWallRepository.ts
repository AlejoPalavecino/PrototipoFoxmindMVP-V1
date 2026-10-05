import type { ClassroomWallRepository, MuroPost } from '../model/ClassroomWall';
import { createWallFixtures } from './wallFixtures';

export let wallPosts = createWallFixtures();

export const replaceWallPosts = (posts: MuroPost[]) => {
  wallPosts = posts;
};

export const classroomWallRepository: ClassroomWallRepository = {
  read: () => wallPosts,
  replace: replaceWallPosts,
};
