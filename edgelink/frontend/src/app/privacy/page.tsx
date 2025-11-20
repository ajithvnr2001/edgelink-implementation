'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function PrivacyPolicyPage() {
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
              <h1 className="text-xl font-bold text-white">EdgeLink</h1>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/pricing" className="text-gray-300 hover:text-white">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-300 hover:text-white">
              Docs
            </Link>
            <Link href="/faq" className="text-gray-300 hover:text-white">
              FAQ
            </Link>
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="btn-primary">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white">
                  Sign In
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
          {/* Mobile nav links */}
          <nav className="flex md:hidden items-center space-x-2">
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="btn-primary text-sm px-3 py-1.5">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="btn-primary text-sm px-3 py-1.5">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: November 20, 2025</p>

          <div className="space-y-8">
            {/* Introduction */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                EdgeLink (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our URL shortening service. Please read this privacy policy carefully. By using EdgeLink, you consent to the data practices described in this policy.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Account Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                When you create an account, we collect your email address and password (stored securely using industry-standard hashing). We may also collect optional profile information you choose to provide.
              </p>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Link Data</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We store the URLs you shorten, custom slugs you create, and associated metadata such as creation dates, expiration dates, and click counts.
              </p>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Analytics Data</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                For Pro users, we collect analytics data including click timestamps, geographic location (country/city level), device type, browser information, and referrer URLs. This data is aggregated and used to provide analytics insights.
              </p>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Usage Information</h3>
              <p className="text-gray-300 leading-relaxed">
                We automatically collect information about how you interact with our service, including IP addresses, browser type, operating system, pages viewed, and timestamps.
              </p>
            </section>

            {/* How We Use Your Information */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>To provide and maintain our URL shortening service</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>To process your account registration and manage your account</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>To provide analytics and insights about your shortened links</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>To communicate with you about service updates, security alerts, and support</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>To detect, prevent, and address abuse, spam, and security issues</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>To improve and optimize our service based on usage patterns</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>To comply with legal obligations and enforce our terms of service</span>
                </li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Sharing and Disclosure</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Service Providers:</strong> We use Cloudflare for hosting and content delivery. These providers have access to your information only to perform services on our behalf.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Legal Requirements:</strong> We may disclose information if required by law, subpoena, or government request.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Safety:</strong> To protect the rights, property, or safety of EdgeLink, our users, or others.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred.</span>
                </li>
              </ul>
            </section>

            {/* Data Security */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
              <p className="text-gray-300 leading-relaxed">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="text-gray-300 space-y-3 mt-4">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>Encryption of data in transit using TLS/SSL</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>Secure password hashing using bcrypt</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>JWT tokens with secure signing for authentication</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>Regular security audits and monitoring</span>
                </li>
              </ul>
            </section>

            {/* Data Retention */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We retain your information for as long as your account is active or as needed to provide you services. You can delete your account at any time through your account settings.
              </p>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>Anonymous links expire after 30 days</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>Account data is deleted upon account deletion request</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span>Analytics data may be retained in aggregated, anonymized form</span>
                </li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="text-gray-300 space-y-3">
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Access:</strong> Request a copy of your personal information</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Correction:</strong> Request correction of inaccurate information</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Deletion:</strong> Request deletion of your account and associated data</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Portability:</strong> Request your data in a portable format</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  <span><strong>Objection:</strong> Object to certain processing of your information</span>
                </li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                To exercise these rights, please contact us at privacy@edgelink.io.
              </p>
            </section>

            {/* Cookies */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Cookies and Tracking</h2>
              <p className="text-gray-300 leading-relaxed">
                We use essential cookies and local storage to maintain your session and preferences. We do not use third-party tracking cookies or advertising trackers. Authentication tokens are stored in local storage and are required for the service to function.
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                EdgeLink is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            {/* International Transfers */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">International Data Transfers</h2>
              <p className="text-gray-300 leading-relaxed">
                Your information may be processed and stored in locations where Cloudflare operates data centers worldwide. By using EdgeLink, you consent to the transfer of your information to these locations. We ensure appropriate safeguards are in place for international data transfers.
              </p>
            </section>

            {/* Changes to Policy */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            {/* Contact */}
            <section className="card p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-primary-500 mt-4">privacy@edgelink.io</p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2025 EdgeLink. Built with Cloudflare Workers.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                Privacy Policy
              </Link>
              <Link href="/faq" className="text-gray-400 hover:text-white text-sm">
                FAQ
              </Link>
              <Link href="/docs" className="text-gray-400 hover:text-white text-sm">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
