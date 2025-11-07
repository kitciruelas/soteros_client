import React from 'react'

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <i className="ri-shield-check-line text-xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Privacy Policy</h3>
                <p className="text-blue-100 text-sm">MDRRMO Rosario, Batangas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-100 transition-colors p-2 hover:bg-white/20 rounded-lg"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8">
            <div className="prose prose-lg max-w-none">
            <div className="mb-6">
              <p className="text-gray-600 text-lg leading-relaxed">
                Last updated: October 01, 2025
              </p>
            </div>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">1. Information We Collect</h4>
              <div className="space-y-4 text-gray-700">
                <p>We collect information you provide directly to us, such as when you:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Create an account or register for our services</li>
                  <li>Report incidents or emergencies</li>
                  <li>Submit welfare check information</li>
                  <li>Contact us for support or assistance</li>
                  <li>Participate in surveys or feedback forms</li>
                </ul>
                <p>This may include your name, email address, phone number, location data, and emergency contact information.</p>
                <p>We also automatically collect certain technical information when you use our service, including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>IP address and network information</li>
                  <li>Device information and browser type</li>
                  <li>Usage patterns and activity logs</li>
                </ul>
                <p>We use IP addresses for security purposes, including preventing abuse, rate limiting, and protecting against unauthorized access attempts.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h4>
              <div className="space-y-4 text-gray-700">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide emergency response services and assistance</li>
                  <li>Process and respond to incident reports</li>
                  <li>Send emergency alerts and safety notifications</li>
                  <li>Coordinate evacuation and welfare check procedures</li>
                  <li>Improve our services and emergency response capabilities</li>
                  <li>Comply with legal obligations and emergency protocols</li>
                  <li>Monitor and prevent abuse, unauthorized access, and security threats</li>
                  <li>Enforce rate limits and prevent system abuse</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">3. Information Sharing</h4>
              <div className="space-y-4 text-gray-700">
                <p>We may share your information with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Emergency response agencies (PNP, BFP, Medical Services)</li>
                  <li>Local government units for disaster management</li>
                  <li>Healthcare providers during medical emergencies</li>
                  <li>Authorized personnel for evacuation coordination</li>
                </ul>
                <p>We only share information when necessary for emergency response, public safety, or as required by law.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">4. Data Security</h4>
              <div className="space-y-4 text-gray-700">
                <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption of sensitive data</li>
                  <li>Secure server infrastructure</li>
                  <li>Access controls and authentication</li>
                  <li>Regular security audits and updates</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">5. Your Rights</h4>
              <div className="space-y-4 text-gray-700">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data (subject to legal requirements)</li>
                  <li>Opt-out of non-emergency communications</li>
                  <li>File a complaint with relevant authorities</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">6. Data Retention</h4>
              <div className="space-y-4 text-gray-700">
                <p>We retain your information for as long as necessary to provide our services and comply with legal obligations. Emergency incident reports may be retained for historical and statistical purposes as required by disaster management protocols.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">7. Contact Information</h4>
              <div className="space-y-4 text-gray-700">
                <p>If you have questions about this Privacy Policy, please contact us:</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <p><strong>MDRRMO Rosario, Batangas</strong></p>
                    <p>📍 Municipal Hall, Rosario, Batangas, Philippines</p>
                    <p>📞 (043) 311.2935</p>
                    <p>📧 mdrrmo@rosario.gov.ph</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">8. Changes to This Policy</h4>
              <div className="space-y-4 text-gray-700">
                <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
              </div>
            </section>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-6 rounded-b-xl border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-gray-600">
              <i className="ri-shield-check-line mr-2 text-blue-500"></i>
              <span className="text-sm font-medium">Your privacy is protected</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
