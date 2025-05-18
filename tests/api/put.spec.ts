import { test, expect } from '@playwright/test';
import { ApiUtils } from '../../utils/api.utils';
import { Post, User } from '../../utils/api.types';
import { faker } from '@faker-js/faker';

test.describe('PUT API Tests', () => {
  const baseUrl = 'https://jsonplaceholder.typicode.com';

  test('should update an existing post', async () => {
    const postId = 1;
    const updatedData = {
      id: postId,
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraphs(),
      userId: faker.number.int({ min: 1, max: 10 })
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
      name: faker.person.fullName(),
      username: faker.internet.username(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      website: faker.internet.domainName()
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
      title: faker.lorem.sentence()
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