'use client'

/**
 * EdgeLink API & Webhooks Documentation
 * Comprehensive beginner-friendly guide for developers
 */

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function DocsPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const [activeTab, setActiveTab] = useState<'getting-started' | 'api' | 'webhooks' | 'examples'>('getting-started')
  const [selectedEndpoint, setSelectedEndpoint] = useState('shorten')
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python' | 'php' | 'ruby' | 'go' | 'java'>('curl')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
            <h1 className="text-xl font-bold text-white">EdgeLink</h1>
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/pricing" className="text-gray-300 hover:text-white">
              Pricing
            </Link>
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="btn-primary">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Developer Documentation
            </h1>
            <p className="text-xl text-gray-400">
              Complete beginner-friendly guide to integrating EdgeLink into your applications
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap space-x-2 mb-8 border-b border-gray-700 pb-2">
            <button
              onClick={() => setActiveTab('getting-started')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${
                activeTab === 'getting-started'
                  ? 'text-primary-500 border-b-2 border-primary-500 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🚀 Getting Started
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${
                activeTab === 'api'
                  ? 'text-primary-500 border-b-2 border-primary-500 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📚 API Reference
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${
                activeTab === 'webhooks'
                  ? 'text-primary-500 border-b-2 border-primary-500 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🪝 Webhooks
            </button>
            <button
              onClick={() => setActiveTab('examples')}
              className={`px-6 py-3 font-semibold transition-colors rounded-t-lg ${
                activeTab === 'examples'
                  ? 'text-primary-500 border-b-2 border-primary-500 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💡 Use Cases & Examples
            </button>
          </div>

          {/* Getting Started Tab */}
          {activeTab === 'getting-started' && (
            <div className="space-y-8">
              {/* Welcome Section */}
              <section className="card p-8 bg-gradient-to-r from-primary-900/20 to-primary-800/20 border-primary-500/30">
                <h2 className="text-3xl font-bold text-white mb-4">👋 Welcome to EdgeLink API</h2>
                <p className="text-lg text-gray-300 mb-6">
                  EdgeLink provides a simple, fast, and powerful REST API for URL shortening.
                  This guide will help you get started in minutes, even if you're new to APIs.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">⚡ Fast & Global</h3>
                    <p className="text-sm text-gray-400">&lt;50ms response time on Cloudflare Edge</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">🔒 Secure</h3>
                    <p className="text-sm text-gray-400">JWT authentication & HTTPS only</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">📊 Feature-Rich</h3>
                    <p className="text-sm text-gray-400">Analytics, routing, QR codes & more</p>
                  </div>
                </div>
              </section>

              {/* Step 1: Sign Up */}
              <section className="card p-8">
                <div className="flex items-center mb-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white font-bold mr-4">1</span>
                  <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
                </div>
                <p className="text-gray-300 mb-4">
                  First, you'll need an EdgeLink account. Sign up for free to get started.
                </p>
                <div className="bg-gray-800/50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-400 mb-2">Free Plan Includes:</p>
                  <ul className="text-sm text-gray-300 space-y-1 ml-4">
                    <li>• 1,000 total active links</li>
                    <li>• 10,000 clicks per month</li>
                    <li>• 100 API calls per day</li>
                    <li>• Basic features included</li>
                  </ul>
                </div>
                <Link href="/signup" className="btn-primary inline-block">
                  Sign Up For Free →
                </Link>
              </section>

              {/* Step 2: Get API Token */}
              <section className="card p-8">
                <div className="flex items-center mb-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white font-bold mr-4">2</span>
                  <h2 className="text-2xl font-bold text-white">Get Your API Token</h2>
                </div>
                <p className="text-gray-300 mb-4">
                  After signing up, you'll need to authenticate to get your JWT token.
                </p>

                <h3 className="text-lg font-semibold text-white mb-3">Option A: Login via API</h3>
                <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4">
                  <code className="text-sm text-gray-300">{`curl -X POST ${API_URL}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400,
  "user": {
    "user_id": "usr_123",
    "email": "your-email@example.com",
    "plan": "free"
  }
}`}</code>
                </pre>

                <h3 className="text-lg font-semibold text-white mb-3">Option B: Use Dashboard</h3>
                <p className="text-gray-400 mb-2">
                  You can also get your token from the dashboard after logging in.
                </p>
              </section>

              {/* Step 3: Make Your First Request */}
              <section className="card p-8">
                <div className="flex items-center mb-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white font-bold mr-4">3</span>
                  <h2 className="text-2xl font-bold text-white">Make Your First API Call</h2>
                </div>
                <p className="text-gray-300 mb-4">
                  Let's create your first short link! Replace <code className="text-primary-400">YOUR_TOKEN</code> with your actual JWT token.
                </p>

                {/* Language Selector */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {['curl', 'javascript', 'python', 'php', 'ruby', 'go', 'java'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang as any)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        selectedLanguage === lang
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {lang === 'curl' ? 'cURL' :
                       lang === 'javascript' ? 'JavaScript' :
                       lang === 'python' ? 'Python' :
                       lang === 'php' ? 'PHP' :
                       lang === 'ruby' ? 'Ruby' :
                       lang === 'go' ? 'Go' :
                       'Java'}
                    </button>
                  ))}
                </div>

                {/* cURL Example */}
                {selectedLanguage === 'curl' && (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm text-gray-300">{`curl -X POST ${API_URL}/api/shorten \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "url": "https://www.example.com/very-long-url-here",
    "custom_slug": "my-link"
  }'

# Response:
{
  "slug": "my-link",
  "short_url": "${API_URL}/my-link",
  "expires_in": null
}`}</code>
                  </pre>
                )}

                {/* JavaScript Example */}
                {selectedLanguage === 'javascript' && (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm text-gray-300">{`// Using Fetch API (built into modern browsers and Node.js 18+)
const response = await fetch('${API_URL}/api/shorten', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    url: 'https://www.example.com/very-long-url-here',
    custom_slug: 'my-link'
  })
});

const data = await response.json();
console.log('Short URL:', data.short_url);
// Output: Short URL: ${API_URL}/my-link

// Using Axios (npm install axios)
const axios = require('axios');

const { data } = await axios.post('${API_URL}/api/shorten', {
  url: 'https://www.example.com/very-long-url-here',
  custom_slug: 'my-link'
}, {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

console.log('Short URL:', data.short_url);`}</code>
                  </pre>
                )}

                {/* Python Example */}
                {selectedLanguage === 'python' && (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm text-gray-300">{`# Using requests library (pip install requests)
import requests

url = "${API_URL}/api/shorten"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_TOKEN"
}
payload = {
    "url": "https://www.example.com/very-long-url-here",
    "custom_slug": "my-link"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print(f"Short URL: {data['short_url']}")
# Output: Short URL: ${API_URL}/my-link

# Using urllib (built-in, no installation needed)
import urllib.request
import json

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers=headers)
with urllib.request.urlopen(req) as response:
    result = json.loads(response.read().decode('utf-8'))
    print(f"Short URL: {result['short_url']}")`}</code>
                  </pre>
                )}

                {/* PHP Example */}
                {selectedLanguage === 'php' && (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm text-gray-300">{`<?php
// Using cURL (built into PHP)
$url = "${API_URL}/api/shorten";
$data = array(
    'url' => 'https://www.example.com/very-long-url-here',
    'custom_slug' => 'my-link'
);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Authorization: Bearer YOUR_TOKEN'
));

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
echo "Short URL: " . $result['short_url'];
// Output: Short URL: ${API_URL}/my-link

// Using Guzzle (composer require guzzlehttp/guzzle)
require 'vendor/autoload.php';

$client = new \\GuzzleHttp\\Client();
$response = $client->post('${API_URL}/api/shorten', [
    'json' => [
        'url' => 'https://www.example.com/very-long-url-here',
        'custom_slug' => 'my-link'
    ],
    'headers' => [
        'Authorization' => 'Bearer YOUR_TOKEN'
    ]
]);

$data = json_decode($response->getBody(), true);
echo "Short URL: " . $data['short_url'];
?>`}</code>
                  </pre>
                )}

                {/* Ruby Example */}
                {selectedLanguage === 'ruby' && (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm text-gray-300">{`# Using Net::HTTP (built-in)
require 'net/http'
require 'json'
require 'uri'

uri = URI.parse("${API_URL}/api/shorten")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri.path, {
  'Content-Type' => 'application/json',
  'Authorization' => 'Bearer YOUR_TOKEN'
})
request.body = {
  url: 'https://www.example.com/very-long-url-here',
  custom_slug: 'my-link'
}.to_json

response = http.request(request)
data = JSON.parse(response.body)
puts "Short URL: #{data['short_url']}"
# Output: Short URL: ${API_URL}/my-link

# Using HTTParty (gem install httparty)
require 'httparty'

response = HTTParty.post('${API_URL}/api/shorten',
  body: {
    url: 'https://www.example.com/very-long-url-here',
    custom_slug: 'my-link'
  }.to_json,
  headers: {
    'Content-Type' => 'application/json',
    'Authorization' => 'Bearer YOUR_TOKEN'
  }
)

puts "Short URL: #{response['short_url']}"`}</code>
                  </pre>
                )}

                {/* Go Example */}
                {selectedLanguage === 'go' && (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm text-gray-300">{`package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

type ShortenRequest struct {
    URL        string \`json:"url"\`
    CustomSlug string \`json:"custom_slug"\`
}

type ShortenResponse struct {
    Slug     string \`json:"slug"\`
    ShortURL string \`json:"short_url"\`
}

func main() {
    url := "${API_URL}/api/shorten"

    payload := ShortenRequest{
        URL:        "https://www.example.com/very-long-url-here",
        CustomSlug: "my-link",
    }

    jsonData, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer YOUR_TOKEN")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    body, _ := ioutil.ReadAll(resp.Body)

    var result ShortenResponse
    json.Unmarshal(body, &result)

    fmt.Printf("Short URL: %s\\n", result.ShortURL)
    // Output: Short URL: ${API_URL}/my-link
}`}</code>
                  </pre>
                )}

                {/* Java Example */}
                {selectedLanguage === 'java' && (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                    <code className="text-sm text-gray-300">{`// Using Java 11+ HttpClient (built-in)
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.json.JSONObject;

public class EdgeLinkExample {
    public static void main(String[] args) throws Exception {
        String url = "${API_URL}/api/shorten";

        JSONObject payload = new JSONObject();
        payload.put("url", "https://www.example.com/very-long-url-here");
        payload.put("custom_slug", "my-link");

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer YOUR_TOKEN")
            .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        JSONObject result = new JSONObject(response.body());
        System.out.println("Short URL: " + result.getString("short_url"));
        // Output: Short URL: ${API_URL}/my-link
    }
}

// Using OkHttp (add dependency: com.squareup.okhttp3:okhttp:4.11.0)
import okhttp3.*;

OkHttpClient client = new OkHttpClient();
MediaType JSON = MediaType.get("application/json; charset=utf-8");

String json = "{\\"url\\":\\"https://www.example.com/very-long-url-here\\",\\"custom_slug\\":\\"my-link\\"}";
RequestBody body = RequestBody.create(json, JSON);

Request request = new Request.Builder()
    .url("${API_URL}/api/shorten")
    .header("Authorization", "Bearer YOUR_TOKEN")
    .post(body)
    .build();

try (Response response = client.newCall(request).execute()) {
    String responseData = response.body().string();
    System.out.println(responseData);
}`}</code>
                  </pre>
                )}
              </section>

              {/* What's Next */}
              <section className="card p-8 bg-gradient-to-r from-green-900/20 to-green-800/20 border-green-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">🎉 You're All Set!</h2>
                <p className="text-gray-300 mb-4">
                  Congratulations! You've created your first short link. Here's what you can explore next:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">📚 API Reference</h3>
                    <p className="text-sm text-gray-400 mb-3">Explore all available endpoints and features</p>
                    <button onClick={() => setActiveTab('api')} className="text-primary-400 text-sm hover:underline">
                      View API Docs →
                    </button>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">🪝 Webhooks</h3>
                    <p className="text-sm text-gray-400 mb-3">Get real-time notifications for events</p>
                    <button onClick={() => setActiveTab('webhooks')} className="text-primary-400 text-sm hover:underline">
                      View Webhook Docs →
                    </button>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">💡 Use Cases</h3>
                    <p className="text-sm text-gray-400 mb-3">See real-world examples and implementations</p>
                    <button onClick={() => setActiveTab('examples')} className="text-primary-400 text-sm hover:underline">
                      View Examples →
                    </button>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">⚡ Upgrade to Pro</h3>
                    <p className="text-sm text-gray-400 mb-3">100K links, 500K clicks/month, advanced features</p>
                    <Link href="/pricing" className="text-primary-400 text-sm hover:underline">
                      View Pricing →
                    </Link>
                  </div>
                </div>
              </section>

              {/* Common Issues */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">🔧 Troubleshooting</h2>
                <div className="space-y-4">
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">401 Unauthorized Error</h3>
                    <p className="text-gray-400 text-sm">Make sure your JWT token is valid and included in the Authorization header: <code className="text-primary-400">Authorization: Bearer YOUR_TOKEN</code></p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">429 Rate Limit Exceeded</h3>
                    <p className="text-gray-400 text-sm">You've hit your daily API limit (100/day free, 5,000/day pro). Wait for the limit to reset or upgrade to Pro.</p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">409 Conflict - Slug Already Exists</h3>
                    <p className="text-gray-400 text-sm">The custom slug you chose is already taken. Try a different slug or let EdgeLink generate one automatically by omitting the custom_slug field.</p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">403 Forbidden - Feature Not Available</h3>
                    <p className="text-gray-400 text-sm">You're trying to use a Pro feature (custom domains, QR codes, routing, etc.). Upgrade to Pro to access all features.</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* API Reference Tab - Keep existing detailed API documentation */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">API Reference</h2>
                <p className="text-gray-400 mb-6">
                  Comprehensive documentation for all EdgeLink API endpoints.
                </p>

                {/* Base URL */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Base URL</h3>
                  <code className="block bg-gray-800 p-4 rounded-lg text-primary-400">
                    {API_URL}
                  </code>
                </div>

                {/* Authentication */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Authentication</h3>
                  <p className="text-gray-400 mb-3">
                    All authenticated endpoints require a JWT token in the Authorization header:
                  </p>
                  <code className="block bg-gray-800 p-4 rounded-lg text-primary-400">
                    Authorization: Bearer YOUR_JWT_TOKEN
                  </code>
                </div>

                {/* Rate Limits */}
                <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Rate Limits</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li><strong className="text-white">Free Plan:</strong> 100 API calls per day</li>
                    <li><strong className="text-white">Pro Plan:</strong> 5,000 API calls per day</li>
                    <li className="text-sm text-gray-400 mt-2">
                      ⚠️ Rate limits reset at midnight UTC. Headers <code className="text-primary-400">X-RateLimit-Remaining</code> and <code className="text-primary-400">X-RateLimit-Reset</code> show your current status.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Continue with existing API endpoint documentation... */}
              {/* I'll keep the rest of the API documentation structure but won't repeat it all here */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Endpoints</h2>
                <p className="text-gray-400 mb-4">Click an endpoint to view detailed documentation</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                  {['shorten', 'links', 'analytics', 'domains'].map((endpoint) => (
                    <button
                      key={endpoint}
                      onClick={() => setSelectedEndpoint(endpoint)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedEndpoint === endpoint
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Shorten Endpoint */}
                {selectedEndpoint === 'shorten' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded">POST</span>
                        <code className="text-primary-400">/api/shorten</code>
                      </div>
                      <p className="text-gray-400">Create a shortened link with optional advanced features</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Request Body Parameters</h4>
                      <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                        <div>
                          <code className="text-primary-400">url</code> <span className="text-red-400">*required*</span>
                          <p className="text-sm text-gray-400 mt-1">The destination URL to shorten (must be a valid HTTP/HTTPS URL)</p>
                        </div>
                        <div>
                          <code className="text-primary-400">custom_slug</code> <span className="text-gray-500">optional</span>
                          <p className="text-sm text-gray-400 mt-1">Custom short code (5-20 characters, alphanumeric and hyphens only)</p>
                        </div>
                        <div>
                          <code className="text-primary-400">custom_domain</code> <span className="text-blue-400">Pro only</span>
                          <p className="text-sm text-gray-400 mt-1">Use your custom domain (must be verified first)</p>
                        </div>
                        <div>
                          <code className="text-primary-400">expires_at</code> <span className="text-gray-500">optional</span>
                          <p className="text-sm text-gray-400 mt-1">ISO 8601 datetime when link expires (e.g., "2025-12-31T23:59:59Z")</p>
                        </div>
                        <div>
                          <code className="text-primary-400">max_clicks</code> <span className="text-gray-500">optional</span>
                          <p className="text-sm text-gray-400 mt-1">Maximum number of clicks before link expires</p>
                        </div>
                        <div>
                          <code className="text-primary-400">password</code> <span className="text-gray-500">optional</span>
                          <p className="text-sm text-gray-400 mt-1">Password-protect your link</p>
                        </div>
                        <div>
                          <code className="text-primary-400">device_routing</code> <span className="text-blue-400">Pro only</span>
                          <p className="text-sm text-gray-400 mt-1">Route users to different URLs based on device type</p>
                        </div>
                        <div>
                          <code className="text-primary-400">geo_routing</code> <span className="text-blue-400">Pro only</span>
                          <p className="text-sm text-gray-400 mt-1">Route users to different URLs based on location</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Example Request</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "url": "https://example.com/very-long-url",
  "custom_slug": "my-link",
  "expires_at": "2025-12-31T23:59:59Z",
  "max_clicks": 1000,
  "password": "secret123",
  "device_routing": {
    "mobile": "https://m.example.com",
    "desktop": "https://example.com",
    "tablet": "https://tablet.example.com"
  },
  "geo_routing": {
    "US": "https://us.example.com",
    "UK": "https://uk.example.com",
    "default": "https://example.com"
  }
}`}</code>
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Success Response (201 Created)</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "slug": "my-link",
  "short_url": "${API_URL}/my-link",
  "expires_in": 31536000,
  "qr_code_url": "${API_URL}/qr/my-link"
}`}</code>
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Error Responses</h4>
                      <div className="space-y-3">
                        <div className="bg-red-900/20 border border-red-500/30 p-3 rounded">
                          <code className="text-red-400">400 Bad Request</code>
                          <p className="text-sm text-gray-400 mt-1">Invalid URL format or missing required fields</p>
                        </div>
                        <div className="bg-red-900/20 border border-red-500/30 p-3 rounded">
                          <code className="text-red-400">409 Conflict</code>
                          <p className="text-sm text-gray-400 mt-1">Custom slug already exists</p>
                        </div>
                        <div className="bg-red-900/20 border border-red-500/30 p-3 rounded">
                          <code className="text-red-400">403 Forbidden</code>
                          <p className="text-sm text-gray-400 mt-1">Link limit reached or trying to use Pro features</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Links Endpoint */}
                {selectedEndpoint === 'links' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Manage Your Links</h3>
                      <p className="text-gray-400">View, update, and delete your shortened links</p>
                    </div>

                    <div className="space-y-6">
                      {/* GET all links */}
                      <div className="border-t border-gray-700 pt-6">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                          <code className="text-primary-400">/api/links</code>
                        </div>
                        <p className="text-gray-400 mb-3">Retrieve all your links (paginated, 50 per page)</p>
                        <h4 className="text-white font-semibold mb-2">Response</h4>
                        <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-gray-300">{`{
  "links": [
    {
      "slug": "my-link",
      "destination": "https://example.com",
      "created_at": "2025-01-15T10:30:00Z",
      "click_count": 42,
      "expires_at": null,
      "custom_domain": null
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 50
}`}</code>
                        </pre>
                      </div>

                      {/* GET single link */}
                      <div className="border-t border-gray-700 pt-6">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                          <code className="text-primary-400">/api/links/:slug</code>
                        </div>
                        <p className="text-gray-400">Get details for a specific link</p>
                      </div>

                      {/* PUT update link */}
                      <div className="border-t border-gray-700 pt-6">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="px-3 py-1 bg-yellow-600 text-white text-sm font-bold rounded">PUT</span>
                          <code className="text-primary-400">/api/links/:slug</code>
                        </div>
                        <p className="text-gray-400 mb-3">Update link details</p>
                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded mb-3">
                          <p className="text-blue-400 text-sm">
                            <strong>Free users:</strong> Can only edit destination URL<br/>
                            <strong>Pro users:</strong> Can edit slug, destination, and all settings
                          </p>
                        </div>
                        <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-gray-300">{`// Free users
{
  "destination": "https://new-url.com"
}

// Pro users
{
  "destination": "https://new-url.com",
  "slug": "new-slug",
  "expires_at": "2025-12-31T23:59:59Z"
}`}</code>
                        </pre>
                      </div>

                      {/* DELETE link */}
                      <div className="border-t border-gray-700 pt-6">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded">DELETE</span>
                          <code className="text-primary-400">/api/links/:slug</code>
                        </div>
                        <p className="text-gray-400">Permanently delete a link</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Endpoint */}
                {selectedEndpoint === 'analytics' && (
                  <div className="space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-4">
                      <p className="text-blue-400">
                        <strong>Pro Feature:</strong> Advanced analytics are only available on the Pro plan.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                        <code className="text-primary-400">/api/analytics/:slug</code>
                      </div>
                      <p className="text-gray-400 mb-3">Get detailed analytics for a specific link</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Query Parameters</h4>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <p><code className="text-primary-400">start_date</code> - Start date (ISO 8601 format)</p>
                        <p className="mt-2"><code className="text-primary-400">end_date</code> - End date (ISO 8601 format)</p>
                        <p className="text-sm text-gray-400 mt-3">Example: <code className="text-primary-400">?start_date=2025-01-01&end_date=2025-01-31</code></p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Response</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "slug": "my-link",
  "total_clicks": 1523,
  "unique_visitors": 892,
  "clicks_by_date": {
    "2025-01-15": 42,
    "2025-01-16": 38,
    "2025-01-17": 55
  },
  "clicks_by_country": {
    "US": 450,
    "UK": 230,
    "CA": 120,
    "IN": 180
  },
  "clicks_by_device": {
    "mobile": 789,
    "desktop": 650,
    "tablet": 84
  },
  "clicks_by_browser": {
    "Chrome": 890,
    "Safari": 420,
    "Firefox": 213
  },
  "clicks_by_os": {
    "Windows": 600,
    "iOS": 450,
    "Android": 339,
    "macOS": 134
  },
  "top_referrers": [
    { "source": "twitter.com", "count": 340 },
    { "source": "facebook.com", "count": 280 },
    { "source": "direct", "count": 200 }
  ]
}`}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Domains Endpoint */}
                {selectedEndpoint === 'domains' && (
                  <div className="space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-4">
                      <p className="text-blue-400">
                        <strong>Pro Feature:</strong> Custom domains (max 2) are only available on the Pro plan.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded">POST</span>
                        <code className="text-primary-400">/api/domains</code>
                      </div>
                      <p className="text-gray-400 mb-3">Add a custom domain</p>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "domain_name": "go.yourdomain.com"
}

// Response:
{
  "domain_id": "dom_abc123",
  "domain_name": "go.yourdomain.com",
  "verified": false,
  "verification": {
    "method": "dns_txt",
    "record": {
      "type": "TXT",
      "name": "_edgelink-verify",
      "value": "edgelink-verify-xyz789",
      "ttl": 3600
    },
    "cname_record": {
      "type": "CNAME",
      "name": "go.yourdomain.com",
      "value": "cname.edgelink.io",
      "ttl": 3600
    }
  }
}`}</code>
                      </pre>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded">POST</span>
                        <code className="text-primary-400">/api/domains/:domainId/verify</code>
                      </div>
                      <p className="text-gray-400">Verify domain ownership after adding DNS records</p>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                        <code className="text-primary-400">/api/domains</code>
                      </div>
                      <p className="text-gray-400">List all your custom domains</p>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded">DELETE</span>
                        <code className="text-primary-400">/api/domains/:domainId</code>
                      </div>
                      <p className="text-gray-400">Remove a custom domain</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Error Codes */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">HTTP Status Codes</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-white">Code</th>
                        <th className="text-left py-3 px-4 text-white">Description</th>
                        <th className="text-left py-3 px-4 text-white">Solution</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-400 text-sm">
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-green-400">200</code></td>
                        <td className="py-3 px-4">Success</td>
                        <td className="py-3 px-4">Request completed successfully</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-green-400">201</code></td>
                        <td className="py-3 px-4">Created</td>
                        <td className="py-3 px-4">Resource created successfully</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">400</code></td>
                        <td className="py-3 px-4">Bad Request</td>
                        <td className="py-3 px-4">Check your request format and required fields</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">401</code></td>
                        <td className="py-3 px-4">Unauthorized</td>
                        <td className="py-3 px-4">Include valid JWT token in Authorization header</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">403</code></td>
                        <td className="py-3 px-4">Forbidden</td>
                        <td className="py-3 px-4">Feature not available on your plan or limit reached</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">404</code></td>
                        <td className="py-3 px-4">Not Found</td>
                        <td className="py-3 px-4">Resource doesn't exist, check the URL/slug</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">409</code></td>
                        <td className="py-3 px-4">Conflict</td>
                        <td className="py-3 px-4">Slug already exists, choose a different one</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">429</code></td>
                        <td className="py-3 px-4">Too Many Requests</td>
                        <td className="py-3 px-4">Rate limit exceeded, wait or upgrade to Pro</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4"><code className="text-red-400">500</code></td>
                        <td className="py-3 px-4">Server Error</td>
                        <td className="py-3 px-4">Contact support if error persists</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* Webhooks Tab - Expanded */}
          {activeTab === 'webhooks' && (
            <div className="space-y-8">
              <section className="card p-8">
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-6">
                  <p className="text-blue-400">
                    <strong>Pro Feature:</strong> Webhooks are only available on the Pro plan ($15/month).
                  </p>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">What are Webhooks?</h2>
                <p className="text-gray-400 mb-6">
                  Webhooks allow your application to receive real-time HTTP notifications when events occur in your EdgeLink account.
                  Instead of polling our API for changes, we'll push updates to your server instantly.
                </p>

                <div className="bg-gray-800/50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">How Webhooks Work</h3>
                  <ol className="space-y-3 text-gray-300">
                    <li className="flex items-start">
                      <span className="text-primary-400 font-bold mr-2">1.</span>
                      <span>You configure a webhook URL in your EdgeLink dashboard</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-400 font-bold mr-2">2.</span>
                      <span>When an event occurs (link clicked, created, etc.), EdgeLink sends an HTTP POST request to your URL</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-400 font-bold mr-2">3.</span>
                      <span>Your server receives the event data and processes it</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-400 font-bold mr-2">4.</span>
                      <span>Your server responds with HTTP 200 to acknowledge receipt</span>
                    </li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Setup Instructions</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400">
                    <li>Go to <Link href="/settings/webhooks" className="text-primary-400 hover:underline">Dashboard → Settings → Webhooks</Link></li>
                    <li>Enter your webhook endpoint URL (must be HTTPS in production)</li>
                    <li>Select which events you want to receive</li>
                    <li>Copy your webhook signing secret (used to verify requests)</li>
                    <li>Save your configuration</li>
                    <li>Test your webhook using the "Send Test Event" button</li>
                  </ol>
                </div>
              </section>

              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Event Types</h2>
                <p className="text-gray-400 mb-6">
                  EdgeLink sends webhooks for the following events. All payloads include an <code className="text-primary-400">event</code> field and <code className="text-primary-400">timestamp</code>.
                </p>

                <div className="space-y-6">
                  {/* link.created */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.created</h3>
                    <p className="text-gray-400 mb-3">Triggered when a new link is created</p>
                    <h4 className="text-white text-sm font-semibold mb-2">Payload Example:</h4>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs">
                      <code className="text-gray-300">{`{
  "event": "link.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "slug": "my-link",
    "destination": "https://example.com",
    "short_url": "${API_URL}/my-link",
    "created_at": "2025-01-15T10:30:00Z",
    "user_id": "usr_123",
    "expires_at": null,
    "max_clicks": null,
    "custom_domain": null
  }
}`}</code>
                    </pre>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Use case:</strong> Log link creation, sync with CRM, trigger automated workflows
                    </p>
                  </div>

                  {/* link.clicked */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.clicked</h3>
                    <p className="text-gray-400 mb-3">Triggered every time a link is clicked (real-time)</p>
                    <h4 className="text-white text-sm font-semibold mb-2">Payload Example:</h4>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs">
                      <code className="text-gray-300">{`{
  "event": "link.clicked",
  "timestamp": "2025-01-15T10:35:00Z",
  "data": {
    "slug": "my-link",
    "destination": "https://example.com",
    "visitor": {
      "ip": "192.168.1.1",
      "country": "US",
      "city": "New York",
      "region": "NY",
      "device": "mobile",
      "device_model": "iPhone 14",
      "browser": "Safari",
      "browser_version": "16.0",
      "os": "iOS",
      "os_version": "16.3",
      "referrer": "https://twitter.com",
      "user_agent": "Mozilla/5.0..."
    },
    "click_id": "clk_xyz789",
    "timestamp": "2025-01-15T10:35:00Z"
  }
}`}</code>
                    </pre>
                    <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded mt-2">
                      <p className="text-xs text-yellow-400">
                        ⚠️ <strong>Note:</strong> High-traffic links may generate many webhooks. Consider implementing rate limiting or batching on your end.
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Use case:</strong> Real-time analytics, fraud detection, A/B testing, conversion tracking
                    </p>
                  </div>

                  {/* link.updated */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.updated</h3>
                    <p className="text-gray-400 mb-3">Triggered when a link's settings are modified</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs">
                      <code className="text-gray-300">{`{
  "event": "link.updated",
  "timestamp": "2025-01-15T11:00:00Z",
  "data": {
    "slug": "my-link",
    "old_destination": "https://example.com",
    "new_destination": "https://new-example.com",
    "updated_fields": ["destination", "expires_at"],
    "updated_at": "2025-01-15T11:00:00Z",
    "user_id": "usr_123"
  }
}`}</code>
                    </pre>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Use case:</strong> Audit logs, change tracking, sync with external systems
                    </p>
                  </div>

                  {/* link.deleted */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.deleted</h3>
                    <p className="text-gray-400 mb-3">Triggered when a link is permanently deleted</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs">
                      <code className="text-gray-300">{`{
  "event": "link.deleted",
  "timestamp": "2025-01-15T12:00:00Z",
  "data": {
    "slug": "my-link",
    "deleted_at": "2025-01-15T12:00:00Z",
    "user_id": "usr_123",
    "final_click_count": 1523
  }
}`}</code>
                    </pre>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Use case:</strong> Clean up external databases, archive analytics data
                    </p>
                  </div>

                  {/* link.expired */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.expired</h3>
                    <p className="text-gray-400 mb-3">Triggered when a link reaches its expiration date or click limit</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs">
                      <code className="text-gray-300">{`{
  "event": "link.expired",
  "timestamp": "2025-01-31T23:59:59Z",
  "data": {
    "slug": "my-link",
    "destination": "https://example.com",
    "expires_at": "2025-01-31T23:59:59Z",
    "expiration_reason": "date_reached", // or "click_limit_reached"
    "total_clicks": 1523,
    "max_clicks": null
  }
}`}</code>
                    </pre>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Use case:</strong> Notify users, create replacement links, update campaign status
                    </p>
                  </div>
                </div>
              </section>

              {/* Security Section */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">🔒 Webhook Security</h2>

                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg mb-6">
                  <h3 className="text-red-400 font-semibold mb-2">⚠️ IMPORTANT: Always Verify Signatures</h3>
                  <p className="text-gray-300 text-sm">
                    Anyone can send HTTP requests to your webhook endpoint. Always verify the signature to ensure requests are from EdgeLink.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">How Signature Verification Works</h3>
                  <p className="text-gray-400 mb-4">
                    Each webhook request includes a signature in the <code className="text-primary-400">X-EdgeLink-Signature</code> header.
                    This signature is an HMAC SHA256 hash of the payload using your webhook secret.
                  </p>

                  {/* Language selector for security examples */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['javascript', 'python', 'php', 'ruby', 'go'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang as any)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedLanguage === lang
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Node.js/Express Example */}
                  {selectedLanguage === 'javascript' && (
                    <div>
                      <h4 className="text-white font-semibold mb-2">Node.js / Express Example</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`const express = require('express');
const crypto = require('crypto');

const app = express();

// IMPORTANT: Use raw body for signature verification
app.use('/webhooks/edgelink', express.raw({ type: 'application/json' }));

app.post('/webhooks/edgelink', (req, res) => {
  const signature = req.headers['x-edgelink-signature'];
  const secret = process.env.WEBHOOK_SECRET; // Get from dashboard

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.log('❌ Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  // Parse the verified payload
  const payload = JSON.parse(req.body.toString());

  console.log('✅ Verified webhook:', payload.event);

  // Handle different event types
  switch (payload.event) {
    case 'link.created':
      console.log('New link created:', payload.data.slug);
      // Your business logic here
      break;

    case 'link.clicked':
      console.log('Link clicked:', payload.data.slug);
      console.log('Visitor from:', payload.data.visitor.country);
      // Track analytics, trigger automation, etc.
      break;

    case 'link.expired':
      console.log('Link expired:', payload.data.slug);
      // Send notification, create replacement link, etc.
      break;

    default:
      console.log('Unknown event:', payload.event);
  }

  // Always respond with 200 to acknowledge receipt
  res.status(200).send('OK');
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});`}</code>
                      </pre>
                    </div>
                  )}

                  {/* Python/Flask Example */}
                  {selectedLanguage === 'python' && (
                    <div>
                      <h4 className="text-white font-semibold mb-2">Python / Flask Example</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`from flask import Flask, request, jsonify
import hashlib
import hmac
import json
import os

app = Flask(__name__)

@app.route('/webhooks/edgelink', methods=['POST'])
def handle_webhook():
    # Get signature from header
    signature = request.headers.get('X-EdgeLink-Signature')
    secret = os.environ.get('WEBHOOK_SECRET')  # Get from dashboard

    # Get raw body
    payload = request.get_data()

    # Verify signature
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    if signature != expected_signature:
        print('❌ Invalid webhook signature')
        return jsonify({'error': 'Invalid signature'}), 401

    # Parse verified payload
    data = json.loads(payload)

    print(f'✅ Verified webhook: {data["event"]}')

    # Handle different event types
    if data['event'] == 'link.created':
        print(f'New link created: {data["data"]["slug"]}')
        # Your business logic here

    elif data['event'] == 'link.clicked':
        print(f'Link clicked: {data["data"]["slug"]}')
        print(f'Visitor from: {data["data"]["visitor"]["country"]}')
        # Track analytics, trigger automation, etc.

    elif data['event'] == 'link.expired':
        print(f'Link expired: {data["data"]["slug"]}')
        # Send notification, create replacement link, etc.

    # Always respond with 200
    return jsonify({'status': 'OK'}), 200

if __name__ == '__main__':
    app.run(port=3000)`}</code>
                      </pre>
                    </div>
                  )}

                  {/* PHP Example */}
                  {selectedLanguage === 'php' && (
                    <div>
                      <h4 className="text-white font-semibold mb-2">PHP Example</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`<?php
// webhook.php

// Get signature from header
$signature = $_SERVER['HTTP_X_EDGELINK_SIGNATURE'] ?? '';
$secret = getenv('WEBHOOK_SECRET'); // Get from dashboard

// Get raw POST body
$payload = file_get_contents('php://input');

// Verify signature
$expectedSignature = hash_hmac('sha256', $payload, $secret);

if ($signature !== $expectedSignature) {
    error_log('❌ Invalid webhook signature');
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Parse verified payload
$data = json_decode($payload, true);

error_log('✅ Verified webhook: ' . $data['event']);

// Handle different event types
switch ($data['event']) {
    case 'link.created':
        error_log('New link created: ' . $data['data']['slug']);
        // Your business logic here
        break;

    case 'link.clicked':
        error_log('Link clicked: ' . $data['data']['slug']);
        error_log('Visitor from: ' . $data['data']['visitor']['country']);
        // Track analytics, trigger automation, etc.
        break;

    case 'link.expired':
        error_log('Link expired: ' . $data['data']['slug']);
        // Send notification, create replacement link, etc.
        break;

    default:
        error_log('Unknown event: ' . $data['event']);
}

// Always respond with 200
http_response_code(200);
echo json_encode(['status' => 'OK']);
?>`}</code>
                      </pre>
                    </div>
                  )}

                  {/* Ruby/Sinatra Example */}
                  {selectedLanguage === 'ruby' && (
                    <div>
                      <h4 className="text-white font-semibold mb-2">Ruby / Sinatra Example</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`require 'sinatra'
require 'json'
require 'openssl'

post '/webhooks/edgelink' do
  # Get signature from header
  signature = request.env['HTTP_X_EDGELINK_SIGNATURE']
  secret = ENV['WEBHOOK_SECRET'] # Get from dashboard

  # Get raw body
  request.body.rewind
  payload = request.body.read

  # Verify signature
  expected_signature = OpenSSL::HMAC.hexdigest(
    'sha256',
    secret,
    payload
  )

  if signature != expected_signature
    puts '❌ Invalid webhook signature'
    halt 401, { error: 'Invalid signature' }.to_json
  end

  # Parse verified payload
  data = JSON.parse(payload)

  puts "✅ Verified webhook: #{data['event']}"

  # Handle different event types
  case data['event']
  when 'link.created'
    puts "New link created: #{data['data']['slug']}"
    # Your business logic here

  when 'link.clicked'
    puts "Link clicked: #{data['data']['slug']}"
    puts "Visitor from: #{data['data']['visitor']['country']}"
    # Track analytics, trigger automation, etc.

  when 'link.expired'
    puts "Link expired: #{data['data']['slug']}"
    # Send notification, create replacement link, etc.

  else
    puts "Unknown event: #{data['event']}"
  end

  # Always respond with 200
  status 200
  { status: 'OK' }.to_json
end`}</code>
                      </pre>
                    </div>
                  )}

                  {/* Go Example */}
                  {selectedLanguage === 'go' && (
                    <div>
                      <h4 className="text-white font-semibold mb-2">Go Example</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "os"
)

type WebhookPayload struct {
    Event     string                 \`json:"event"\`
    Timestamp string                 \`json:"timestamp"\`
    Data      map[string]interface{} \`json:"data"\`
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
    // Get signature from header
    signature := r.Header.Get("X-EdgeLink-Signature")
    secret := os.Getenv("WEBHOOK_SECRET") // Get from dashboard

    // Read body
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Error reading body", http.StatusBadRequest)
        return
    }

    // Verify signature
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    expectedSignature := hex.EncodeToString(mac.Sum(nil))

    if signature != expectedSignature {
        log.Println("❌ Invalid webhook signature")
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Parse verified payload
    var payload WebhookPayload
    if err := json.Unmarshal(body, &payload); err != nil {
        http.Error(w, "Error parsing JSON", http.StatusBadRequest)
        return
    }

    log.Printf("✅ Verified webhook: %s\\n", payload.Event)

    // Handle different event types
    switch payload.Event {
    case "link.created":
        slug := payload.Data["slug"]
        log.Printf("New link created: %v\\n", slug)
        // Your business logic here

    case "link.clicked":
        slug := payload.Data["slug"]
        visitor := payload.Data["visitor"].(map[string]interface{})
        log.Printf("Link clicked: %v\\n", slug)
        log.Printf("Visitor from: %v\\n", visitor["country"])
        // Track analytics, trigger automation, etc.

    case "link.expired":
        slug := payload.Data["slug"]
        log.Printf("Link expired: %v\\n", slug)
        // Send notification, create replacement link, etc.

    default:
        log.Printf("Unknown event: %s\\n", payload.Event)
    }

    // Always respond with 200
    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, "OK")
}

func main() {
    http.HandleFunc("/webhooks/edgelink", handleWebhook)
    log.Println("Webhook server running on :3000")
    log.Fatal(http.ListenAndServe(":3000", nil))
}`}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </section>

              {/* Best Practices */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">✨ Webhook Best Practices</h2>
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-500/30 p-4 rounded">
                    <h3 className="text-green-400 font-semibold mb-2">✅ DO:</h3>
                    <ul className="text-gray-300 space-y-2 ml-4">
                      <li>• Always verify the webhook signature</li>
                      <li>• Respond with HTTP 200 as quickly as possible (within 5 seconds)</li>
                      <li>• Process webhook payloads asynchronously (use queues)</li>
                      <li>• Use HTTPS for your webhook endpoint (required in production)</li>
                      <li>• Implement idempotency (handle duplicate events gracefully)</li>
                      <li>• Log all webhook receipts for debugging</li>
                      <li>• Implement retry logic on your end for failed processing</li>
                      <li>• Use environment variables for webhook secrets</li>
                    </ul>
                  </div>

                  <div className="bg-red-900/20 border border-red-500/30 p-4 rounded">
                    <h3 className="text-red-400 font-semibold mb-2">❌ DON'T:</h3>
                    <ul className="text-gray-300 space-y-2 ml-4">
                      <li>• Never skip signature verification</li>
                      <li>• Don't perform long-running operations in the webhook handler</li>
                      <li>• Don't use HTTP (use HTTPS only)</li>
                      <li>• Don't hard-code webhook secrets</li>
                      <li>• Don't expose webhook endpoints without authentication</li>
                      <li>• Don't assume webhook order (they may arrive out of order)</li>
                      <li>• Don't ignore webhook delivery failures</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Testing Webhooks */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">🧪 Testing Webhooks</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Local Development</h3>
                    <p className="text-gray-400 mb-4">
                      For local testing, you'll need to expose your local server to the internet. Here are some popular tools:
                    </p>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-800/50 p-4 rounded">
                        <h4 className="text-white font-semibold mb-2">ngrok</h4>
                        <code className="text-xs text-gray-400 block">ngrok http 3000</code>
                        <p className="text-xs text-gray-500 mt-2">Free, easy to use</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded">
                        <h4 className="text-white font-semibold mb-2">localtunnel</h4>
                        <code className="text-xs text-gray-400 block">lt --port 3000</code>
                        <p className="text-xs text-gray-500 mt-2">No signup required</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded">
                        <h4 className="text-white font-semibold mb-2">CloudFlare Tunnel</h4>
                        <code className="text-xs text-gray-400 block">cloudflared tunnel</code>
                        <p className="text-xs text-gray-500 mt-2">Secure, fast</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Testing Tools</h3>
                    <p className="text-gray-400 mb-3">Use these tools to inspect and debug webhook payloads:</p>
                    <ul className="text-gray-300 space-y-2 ml-4">
                      <li>• <strong className="text-white">webhook.site</strong> - Inspect webhook payloads</li>
                      <li>• <strong className="text-white">RequestBin</strong> - Capture and inspect HTTP requests</li>
                      <li>• <strong className="text-white">Postman</strong> - Test webhook endpoints manually</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Manual Testing</h3>
                    <p className="text-gray-400 mb-3">
                      You can manually trigger webhook events from your EdgeLink dashboard:
                    </p>
                    <ol className="list-decimal list-inside text-gray-300 space-y-2">
                      <li>Go to Settings → Webhooks</li>
                      <li>Click "Send Test Event"</li>
                      <li>Select event type to send</li>
                      <li>Check your server logs to verify receipt</li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* Troubleshooting */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">🔧 Webhook Troubleshooting</h2>
                <div className="space-y-4">
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">Not Receiving Webhooks</h3>
                    <ul className="text-gray-400 text-sm space-y-1 ml-4">
                      <li>• Check your webhook URL is accessible publicly</li>
                      <li>• Verify your endpoint returns HTTP 200</li>
                      <li>• Check firewall/security group settings</li>
                      <li>• Ensure HTTPS is configured correctly</li>
                      <li>• Look for EdgeLink webhook deliveries in dashboard logs</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">Signature Verification Failing</h3>
                    <ul className="text-gray-400 text-sm space-y-1 ml-4">
                      <li>• Ensure you're using the raw request body (not parsed JSON)</li>
                      <li>• Verify you're using the correct webhook secret</li>
                      <li>• Check for character encoding issues</li>
                      <li>• Make sure HMAC algorithm is SHA-256</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">Receiving Duplicate Events</h3>
                    <ul className="text-gray-400 text-sm space-y-1 ml-4">
                      <li>• Implement idempotency using event IDs or timestamps</li>
                      <li>• Store processed event IDs in database</li>
                      <li>• Check for webhook retry logic issues</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h3 className="text-white font-semibold mb-1">High Volume Issues</h3>
                    <ul className="text-gray-400 text-sm space-y-1 ml-4">
                      <li>• Use message queues (RabbitMQ, Redis, AWS SQS)</li>
                      <li>• Implement rate limiting on your webhook endpoint</li>
                      <li>• Consider batching events or using link.clicked less frequently</li>
                      <li>• Scale your webhook processing infrastructure</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Use Cases & Examples Tab */}
          {activeTab === 'examples' && (
            <div className="space-y-8">
              <section className="card p-8">
                <h2 className="text-3xl font-bold text-white mb-4">💡 Real-World Use Cases</h2>
                <p className="text-xl text-gray-400 mb-8">
                  See how developers are using EdgeLink in production
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Use Case 1 */}
                  <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-500/30 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">📱 Social Media Marketing</h3>
                    <p className="text-gray-300 mb-4 text-sm">
                      Track campaign performance across multiple platforms with device and geo routing.
                    </p>
                    <div className="bg-gray-800/50 p-3 rounded text-xs">
                      <strong className="text-primary-400">Features Used:</strong>
                      <ul className="text-gray-400 mt-2 space-y-1">
                        <li>• Custom slugs for branded links</li>
                        <li>• Device routing (mobile vs desktop)</li>
                        <li>• Analytics API for dashboard integration</li>
                        <li>• Webhooks for real-time conversion tracking</li>
                      </ul>
                    </div>
                  </div>

                  {/* Use Case 2 */}
                  <div className="bg-gradient-to-br from-green-900/20 to-green-800/20 border border-green-500/30 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">🎓 Educational Content</h3>
                    <p className="text-gray-300 mb-4 text-sm">
                      Share course materials with expiring links and password protection for enrolled students.
                    </p>
                    <div className="bg-gray-800/50 p-3 rounded text-xs">
                      <strong className="text-primary-400">Features Used:</strong>
                      <ul className="text-gray-400 mt-2 space-y-1">
                        <li>• Link expiration (30 days after enrollment)</li>
                        <li>• Password protection for exclusive content</li>
                        <li>• Max clicks limit for premium materials</li>
                        <li>• Analytics to track engagement</li>
                      </ul>
                    </div>
                  </div>

                  {/* Use Case 3 */}
                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border border-purple-500/30 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">🛍️ E-Commerce</h3>
                    <p className="text-gray-300 mb-4 text-sm">
                      Create dynamic product links that route customers to region-specific stores.
                    </p>
                    <div className="bg-gray-800/50 p-3 rounded text-xs">
                      <strong className="text-primary-400">Features Used:</strong>
                      <ul className="text-gray-400 mt-2 space-y-1">
                        <li>• Geographic routing (US/EU/Asia stores)</li>
                        <li>• QR codes for in-store displays</li>
                        <li>• Webhooks for order attribution</li>
                        <li>• Custom domains for white-labeling</li>
                      </ul>
                    </div>
                  </div>

                  {/* Use Case 4 */}
                  <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 border border-orange-500/30 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">📊 SaaS Product</h3>
                    <p className="text-gray-300 mb-4 text-sm">
                      Generate unique onboarding links with analytics for each customer segment.
                    </p>
                    <div className="bg-gray-800/50 p-3 rounded text-xs">
                      <strong className="text-primary-400">Features Used:</strong>
                      <ul className="text-gray-400 mt-2 space-y-1">
                        <li>• Bulk link creation via API</li>
                        <li>• UTM parameter templates</li>
                        <li>• Webhooks for lead scoring</li>
                        <li>• Analytics API for business intelligence</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Code Examples */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">📖 Complete Code Examples</h2>

                <div className="space-y-8">
                  {/* Example 1: Bulk Link Creation */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Example 1: Bulk Link Creation</h3>
                    <p className="text-gray-400 mb-3 text-sm">
                      Create multiple short links from a CSV file
                    </p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`// Node.js example
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');

const API_URL = '${API_URL}';
const API_TOKEN = 'YOUR_JWT_TOKEN';

async function bulkCreateLinks(csvFile) {
  const links = [];

  // Read CSV file
  fs.createReadStream(csvFile)
    .pipe(csv())
    .on('data', (row) => {
      links.push({
        url: row.destination,
        custom_slug: row.slug,
        expires_at: row.expires_at
      });
    })
    .on('end', async () => {
      console.log(\`Processing \${links.length} links...\`);

      // Create links with rate limiting
      for (const link of links) {
        try {
          const { data } = await axios.post(
            \`\${API_URL}/api/shorten\`,
            link,
            { headers: { 'Authorization': \`Bearer \${API_TOKEN}\` }}
          );
          console.log(\`✅ Created: \${data.short_url}\`);

          // Wait 1 second between requests (rate limiting)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(\`❌ Failed: \${link.url}\`, error.response?.data);
        }
      }
      console.log('Done!');
    });
}

bulkCreateLinks('links.csv');`}</code>
                    </pre>
                  </div>

                  {/* Example 2: QR Code Generation */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Example 2: Generate QR Codes for Links</h3>
                    <p className="text-gray-400 mb-3 text-sm">
                      Create short links and download QR codes (Pro feature)
                    </p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`# Python example
import requests
from PIL import Image
from io import BytesIO

API_URL = '${API_URL}'
API_TOKEN = 'YOUR_JWT_TOKEN'

def create_link_with_qr(url, slug):
    # Create short link
    response = requests.post(
        f'{API_URL}/api/shorten',
        json={'url': url, 'custom_slug': slug},
        headers={'Authorization': f'Bearer {API_TOKEN}'}
    )
    data = response.json()

    print(f"✅ Short URL: {data['short_url']}")
    print(f"📱 QR Code: {data['qr_code_url']}")

    # Download QR code
    qr_response = requests.get(data['qr_code_url'])
    qr_image = Image.open(BytesIO(qr_response.content))

    # Save QR code
    qr_image.save(f'{slug}_qr.png')
    print(f'💾 Saved: {slug}_qr.png')

    return data

# Usage
create_link_with_qr('https://example.com/product', 'my-product')`}</code>
                    </pre>
                  </div>

                  {/* Example 3: Geographic Routing */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Example 3: Geographic Routing</h3>
                    <p className="text-gray-400 mb-3 text-sm">
                      Route visitors to region-specific pages
                    </p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`// JavaScript example
const axios = require('axios');

const API_URL = '${API_URL}';
const API_TOKEN = 'YOUR_JWT_TOKEN';

async function createGeoRoutedLink() {
  const { data } = await axios.post(
    \`\${API_URL}/api/shorten\`,
    {
      url: 'https://example.com',  // Default/fallback URL
      custom_slug: 'global-store',
      geo_routing: {
        'US': 'https://us.example.com',
        'GB': 'https://uk.example.com',
        'DE': 'https://de.example.com',
        'JP': 'https://jp.example.com',
        'AU': 'https://au.example.com'
      }
    },
    { headers: { 'Authorization': \`Bearer \${API_TOKEN}\` }}
  );

  console.log(\`✅ Created geo-routed link: \${data.short_url}\`);
  console.log('Visitors will be automatically routed based on their location!');
}

createGeoRoutedLink();`}</code>
                    </pre>
                  </div>
                </div>
              </section>

              {/* SDKs and Libraries */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">🧰 Community SDKs & Tools</h2>
                <p className="text-gray-400 mb-6">
                  Third-party libraries to make integration even easier
                </p>
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded">
                  <p className="text-blue-400">
                    📦 Official SDKs coming soon! Star our GitHub repo to get notified.
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    In the meantime, our REST API is simple enough to use directly with standard HTTP libraries.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* CTA Section */}
          <section className="card p-8 bg-gradient-to-r from-primary-600 to-primary-800 text-center mt-12">
            <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
            <p className="text-gray-200 mb-6">
              {isSignedIn
                ? "Got questions? We're here to help!"
                : "Sign up now to start building with EdgeLink."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <>
                  <Link href="/dashboard" className="btn-secondary inline-block">
                    Go to Dashboard
                  </Link>
                  <a href="mailto:support@edgelink.com" className="btn-secondary inline-block">
                    Contact Support
                  </a>
                </>
              ) : (
                <Link href="/signup" className="btn-secondary inline-block">
                  Sign Up Free
                </Link>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2025 EdgeLink. Built with Cloudflare Workers.</p>
          <p className="text-sm mt-2">Need help? Email: support@edgelink.com</p>
        </div>
      </footer>
    </div>
  )
}
