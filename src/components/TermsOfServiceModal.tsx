import React from 'react'

interface TermsOfServiceModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <i className="ri-file-text-line text-xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Terms of Service</h3>
                <p className="text-green-100 text-sm">MDRRMO Rosario, Batangas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-100 transition-colors p-2 hover:bg-white/20 rounded-lg"
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
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h4>
              <div className="space-y-4 text-gray-700">
                <p>By accessing and using the MDRRMO Rosario Emergency Management System ("Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
                <p>If you do not agree to abide by the above, please do not use this service.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">2. Service Description</h4>
              <div className="space-y-4 text-gray-700">
                <p>Our service provides:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Emergency incident reporting and tracking</li>
                  <li>Evacuation center information and routing</li>
                  <li>Safety protocols and emergency procedures</li>
                  <li>Welfare check and status reporting</li>
                  <li>Emergency alerts and notifications</li>
                  <li>Community safety resources and information</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">3. User Responsibilities</h4>
              <div className="space-y-4 text-gray-700">
                <p>As a user of this service, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and truthful information</li>
                  <li>Use the service only for legitimate emergency and safety purposes</li>
                  <li>Not submit false or misleading incident reports</li>
                  <li>Respect the privacy and safety of other users</li>
                  <li>Follow all applicable laws and regulations</li>
                  <li>Not interfere with or disrupt the service</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">4. Emergency Use</h4>
              <div className="space-y-4 text-gray-700">
                <p><strong>Important:</strong> This service is designed to complement, not replace, traditional emergency services.</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <i className="ri-error-warning-line text-red-500 text-xl mr-3 mt-1"></i>
                    <div>
                      <p className="font-semibold text-red-800 mb-2">For Life-Threatening Emergencies:</p>
                      <p className="text-red-700">Call emergency hotlines directly:</p>
                      <ul className="list-disc pl-4 mt-2 text-red-700">
                        <li>MDRRMO: (043) 311.2935</li>
                        <li>PNP: (043) 724.7026</li>
                        <li>BFP: (043) 312.1102</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">5. Account Registration</h4>
              <div className="space-y-4 text-gray-700">
                <p>To access certain features, you may need to register for an account. You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized use</li>
                  <li>Accept responsibility for all activities under your account</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">6. Data and Privacy</h4>
              <div className="space-y-4 text-gray-700">
                <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>
                <p>By using this service, you consent to the collection and use of your information as described in our Privacy Policy.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">7. Service Availability</h4>
              <div className="space-y-4 text-gray-700">
                <p>While we strive to maintain continuous service availability:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Service may be temporarily unavailable due to maintenance or technical issues</li>
                  <li>We do not guarantee uninterrupted access</li>
                  <li>Emergency services should not rely solely on this platform</li>
                  <li>We reserve the right to modify or discontinue features</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">8. Prohibited Uses</h4>
              <div className="space-y-4 text-gray-700">
                <p>You may not use this service to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Submit false emergency reports or information</li>
                  <li>Harass, threaten, or harm others</li>
                  <li>Violate any laws or regulations</li>
                  <li>Interfere with emergency response operations</li>
                  <li>Attempt to gain unauthorized access to systems</li>
                  <li>Distribute malware or harmful content</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h4>
              <div className="space-y-4 text-gray-700">
                <p>MDRRMO Rosario and its affiliates shall not be liable for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Service interruptions or technical failures</li>
                  <li>Delays in emergency response</li>
                  <li>Inaccurate information provided by third parties</li>
                  <li>Consequences of user actions based on service information</li>
                </ul>
                <p>This service is provided "as is" without warranties of any kind.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">10. Termination</h4>
              <div className="space-y-4 text-gray-700">
                <p>We may terminate or suspend your access to the service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">11. Changes to Terms</h4>
              <div className="space-y-4 text-gray-700">
                <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of the modified terms.</p>
              </div>
            </section>

            <section className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4">12. Contact Information</h4>
              <div className="space-y-4 text-gray-700">
                <p>For questions about these Terms of Service, contact us:</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
              <h4 className="text-xl font-bold text-gray-900 mb-4">13. Governing Law</h4>
              <div className="space-y-4 text-gray-700">
                <p>These Terms of Service are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in the appropriate courts of Batangas Province.</p>
              </div>
            </section>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-6 rounded-b-xl border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-gray-600">
              <i className="ri-file-text-line mr-2 text-green-500"></i>
              <span className="text-sm font-medium">Terms effective immediately</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
