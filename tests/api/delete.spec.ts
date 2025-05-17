import { test, expect } from '@playwright/test';
import { ApiUtils } from '../../utils/api.utils';

test.describe('DELETE API Tests', () => {
  const baseUrl = 'https://jsonplaceholder.typicode.com';

  test('should delete a post', async () => {
    const postId = 1;
    
    const response = await ApiUtils.delete<Record<string, never>>(`${baseUrl}/posts/${postId}`);
    
    expect(response.status).toBe(200);
    // For JSONPlaceholder API, the response body is usually an empty object for DELETE requests
    expect(Object.keys(response.data as object).length).toBe(0);
  });

  test('should delete a user', async () => {
    const userId = 2;
    
    const response = await ApiUtils.delete<Record<string, never>>(`${baseUrl}/users/${userId}`);
    
    expect(response.status).toBe(200);
    // Verify the response format for the API
    expect(Object.keys(response.data as object).length).toBe(0);
  });

  test('should delete a comment', async () => {
    const commentId = 5;
    
    const response = await ApiUtils.delete<Record<string, never>>(`${baseUrl}/comments/${commentId}`);
    
    expect(response.status).toBe(200);
  });

  test('should handle deleting a non-existent resource', async () => {
    // JSONPlaceholder API typically returns 200 even for non-existent resources
    // but this shows how to handle 404s if the API were to return them
    try {
      const response = await ApiUtils.delete<Record<string, never>>(`${baseUrl}/posts/999`);
      expect(response.status).toBe(200);
    } catch (error: any) {
      if (error.response) {
        expect(error.response.status).toBe(404);
      } else {
        throw error; // Re-throw if it's not a response error
      }
    }
  });
});