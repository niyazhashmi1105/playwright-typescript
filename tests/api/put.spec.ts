import { test, expect } from '@playwright/test';
import { ApiUtils } from '../../utils/api.utils';
import { Post, User } from '../../utils/api.types';

test.describe('PUT API Tests', () => {
  const baseUrl = 'https://jsonplaceholder.typicode.com';

  test('should update an existing post', async () => {
    const postId = 1;
    const updatedData = {
      id: postId,
      title: 'Updated Post Title',
      body: 'This post has been updated with Playwright and Axios',
      userId: 1
    };

    const response = await ApiUtils.put<Post>(`${baseUrl}/posts/${postId}`, updatedData);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.id).toBe(postId);
    expect(response.data.title).toBe(updatedData.title);
    expect(response.data.body).toBe(updatedData.body);
  });

  test('should update user information', async () => {
    const userId = 1;
    const updatedUserData = {
      id: userId,
      name: 'Updated User',
      username: 'updateduser',
      email: 'updated@example.com',
      phone: '987-654-3210',
      website: 'updateduser.com'
    };

    const response = await ApiUtils.put<User>(`${baseUrl}/users/${userId}`, updatedUserData);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.id).toBe(userId);
    expect(response.data.name).toBe(updatedUserData.name);
    expect(response.data.email).toBe(updatedUserData.email);
    expect(response.data.phone).toBe(updatedUserData.phone);
  });

  test('should partially update a post with PATCH', async () => {
    const postId = 1;
    const partialUpdate = {
      title: 'Partially Updated Title'
    };

    const response = await ApiUtils.patch<Post>(`${baseUrl}/posts/${postId}`, partialUpdate);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.id).toBe(postId);
    expect(response.data.title).toBe(partialUpdate.title);
    // The body should remain unchanged in the response
    expect(response.data.body).toBeTruthy();
  });
});