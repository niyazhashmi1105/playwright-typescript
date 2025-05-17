import { test, expect } from '@playwright/test';
import { ApiUtils } from '../../utils/api.utils';
import { Post, User, Comment } from '../../utils/api.types';

test.describe('POST API Tests', () => {
  const baseUrl = 'https://jsonplaceholder.typicode.com';

  test('should create a new post', async () => {
    const postData = {
      title: 'Playwright API Testing',
      body: 'This is a test post created with Axios in Playwright',
      userId: 1
    };

    const response = await ApiUtils.post<Post>(`${baseUrl}/posts`, postData);
    
    expect(response.status).toBe(201);
    expect(response.data).toBeTruthy();
    expect(response.data.id).toBeTruthy();
    expect(response.data.title).toBe(postData.title);
    expect(response.data.body).toBe(postData.body);
    expect(response.data.userId).toBe(postData.userId);
  });

  test('should create a new user', async () => {
    const userData = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      address: {
        street: 'Test Street',
        suite: 'Apt 123',
        city: 'Testville',
        zipcode: '12345'
      },
      phone: '123-456-7890',
      website: 'testuser.com'
    };

    const response = await ApiUtils.post<User>(`${baseUrl}/users`, userData);
    
    expect(response.status).toBe(201);
    expect(response.data).toBeTruthy();
    expect(response.data.id).toBeTruthy();
    expect(response.data.name).toBe(userData.name);
    expect(response.data.email).toBe(userData.email);
  });

  test('should create a comment on a post', async () => {
    const commentData = {
      postId: 1,
      name: 'Test Comment',
      email: 'commenter@example.com',
      body: 'This is a test comment on the post'
    };

    const response = await ApiUtils.post<Comment>(`${baseUrl}/comments`, commentData);
    
    expect(response.status).toBe(201);
    expect(response.data).toBeTruthy();
    expect(response.data.id).toBeTruthy();
    expect(response.data.name).toBe(commentData.name);
    expect(response.data.email).toBe(commentData.email);
    expect(response.data.body).toBe(commentData.body);
  });
});