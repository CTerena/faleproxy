const request = require('supertest');
const cheerio = require('cheerio');
const express = require('express');
const { sampleHtmlWithYale } = require('./test-utils');
const app = require('../app');

let mockServer;
let mockServerInstance;

describe('Integration Tests', () => {
  // Set up a mock server to serve test content
  beforeAll(async () => {
    mockServer = express();
    mockServer.get('/', (req, res) => {
      res.send(sampleHtmlWithYale);
    });
    mockServerInstance = mockServer.listen(3098);
  });

  afterAll(async () => {
    if (mockServerInstance) {
      await new Promise(resolve => mockServerInstance.close(resolve));
    }
  });

  test('Should serve the homepage', async () => {
    const response = await request(app)
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);

    expect(response.text).toContain('html');
    expect(response.text).toContain('Faleproxy');
  });

  test('Should replace Yale with Fale in fetched content', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'http://localhost:3098/' })
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify Yale has been replaced with Fale in text
    const $ = cheerio.load(response.body.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');

    // Verify URLs remain unchanged
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);

    // Verify link text is changed
    expect($('a').first().text()).toBe('About Fale');
  });

  test('Should handle invalid URLs', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'not-a-valid-url' })
      .expect(500);

    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('Should handle missing URL parameter', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({})
      .expect(400);

    expect(response.body.error).toBe('URL is required');
  });
});
