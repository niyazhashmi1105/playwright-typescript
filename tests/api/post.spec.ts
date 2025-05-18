import { test, expect } from '@playwright/test';
import { ApiUtils } from '../../utils/api.utils';
import { Post, User, Comment } from '../../utils/api.types';
import { faker } from '@faker-js/faker';

test.describe('POST API Tests', () => {
  const baseUrl = 'https://jsonplaceholder.typicode.com';

  test('should create a new post', async () => {
    const postData = {
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraphs(),
      userId: faker.number.int({ min: 1, max: 10 })
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
      name: faker.person.fullName(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      address: {
        street: faker.location.street(),
        suite: faker.location.secondaryAddress(),
        city: faker.location.city(),
        zipcode: faker.location.zipCode()
      },
      phone: faker.phone.number(),
      website: faker.internet.domainName()
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
      postId: faker.number.int({ min: 1, max: 100 }),
      name: faker.lorem.sentence(),
      email: faker.internet.email(),
      body: faker.lorem.paragraph()
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