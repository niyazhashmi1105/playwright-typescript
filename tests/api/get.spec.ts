import { test, expect } from '@playwright/test';
import { ApiUtils } from '../../utils/api.utils';
import { User, Post } from '../../utils/api.types';

test.describe('GET API Tests', () => {
  const baseUrl = 'https://jsonplaceholder.typicode.com';

  test('should fetch a list of users', async () => {
    const response = await ApiUtils.get<User[]>(`${baseUrl}/users`);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(Array.isArray(response.data)).toBeTruthy();
    expect(response.data.length).toBeGreaterThan(0);
  });

  test('should fetch a specific user by ID', async () => {
    const userId = 1;
    const response = await ApiUtils.get<User>(`${baseUrl}/users/${userId}`);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.data.id).toBe(userId);
    expect(response.data.name).toBeTruthy();
    expect(response.data.email).toBeTruthy();
  });

  test('should handle non-existent user', async () => {
    try {
      await ApiUtils.get<User>(`${baseUrl}/users/999`);
    } catch (error: any) {
      expect(error.response.status).toBe(404);
    }
  });

  test('should fetch user posts', async () => {
    const userId = 1;
    const response = await ApiUtils.get<Post[]>(`${baseUrl}/users/${userId}/posts`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBeTruthy();
    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data[0].userId).toBe(userId);
  });
});