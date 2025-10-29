import React, { useState } from 'react';
import { FiMail, FiPhone, FiClock, FiMessageSquare, FiHelpCircle, FiCheckCircle, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';

function CustomerService() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Support ticket submitted successfully! Our team will contact you within 24 hours.');
    setContactForm({
      name: '',
      email: '',
      subject: '',
      message: '',
      priority: 'medium'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const supportChannels = [
    {
      icon: FiMail,
      title: 'Email Support',
      description: 'Send us an email and we\'ll respond within 24 hours',
      contact: 'support@velocityhub.com',
      availability: '24/7',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: FiPhone,
      title: 'Phone Support',
      description: 'Speak with our support team directly',
      contact: '+1 (555) 123-4567',
      availability: 'Mon-Fri, 9AM-6PM EST',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: FiMessageSquare,
      title: 'Live Chat',
      description: 'Get instant answers to your questions',
      contact: 'Available in app',
      availability: 'Mon-Fri, 9AM-9PM EST',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: FiHelpCircle,
      title: 'Help Center',
      description: 'Browse our knowledge base and FAQs',
      contact: 'help.velocityhub.com',
      availability: '24/7',
      color: 'bg-yellow-100 text-yellow-600'
    }
  ];

  const faqs = [
    {
      question: 'How do I add new leads to my CRM?',
      answer: 'Navigate to the Leads page and click the "New Lead" button. Fill in the required information including name, email, and company details. You can also import leads in bulk via CSV files.'
    },
    {
      question: 'Can I integrate VelocityHub with other tools?',
      answer: 'Yes! VelocityHub supports integrations with popular tools like Gmail, Outlook, Slack, and Zapier. You can manage integrations from the Settings > Integrations page.'
    },
    {
      question: 'How does the AI-powered lead scoring work?',
      answer: 'Our AI analyzes multiple factors including engagement history, company size, industry, and interaction patterns to predict the likelihood of conversion. The score is updated in real-time as new data comes in.'
    },
    {
      question: 'What are the different subscription tiers?',
      answer: 'We offer Free, Pro, and Enterprise tiers. The Free tier includes up to 100 contacts, Pro includes 1,000 contacts with advanced features, and Enterprise offers unlimited contacts with custom solutions.'
    },
    {
      question: 'How secure is my data?',
      answer: 'We take security seriously. All data is encrypted in transit and at rest using AES-256 encryption. We\'re SOC 2 compliant and regularly undergo third-party security audits.'
    },
    {
      question: 'Can I export my data?',
      answer: 'Absolutely! You can export your leads, deals, and contacts at any time in CSV or JSON format. Go to Settings > Data Export to download your complete database.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header with Image */}
      <div className="relative h-80 overflow-hidden rounded-lg">
        <img
          src="/assets/images/customer-service.jpg"
          alt="Customer Service"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-transparent"></div>

        {/* Content */}
        <div className="relative h-full flex items-center px-8">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-4">
              Customer Service & Support
            </h1>
            <p className="text-xl text-gray-200 drop-shadow-md mb-6">
              We're here to help! Get assistance from our dedicated support team available 24/7
            </p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <FiClock className="text-green-400" size={20} />
                <span className="text-white font-medium">24/7 Availability</span>
              </div>
              <div className="flex items-center space-x-2">
                <FiCheckCircle className="text-green-400" size={20} />
                <span className="text-white font-medium">Expert Support Team</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Support Channels */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supportChannels.map((channel, index) => {
              const Icon = channel.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className={`inline-flex p-3 rounded-lg ${channel.color} mb-4`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {channel.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {channel.description}
                  </p>
                  <p className="text-sm font-medium text-primary-600 mb-2">
                    {channel.contact}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <FiClock size={14} className="mr-1" />
                    {channel.availability}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Form and FAQs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Submit a Support Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={contactForm.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={contactForm.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  name="priority"
                  value={contactForm.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="low">Low - General Question</option>
                  <option value="medium">Medium - Need Assistance</option>
                  <option value="high">High - System Issue</option>
                  <option value="urgent">Urgent - Critical Problem</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={contactForm.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleChange}
                  required
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Please describe your issue in detail..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold flex items-center justify-center"
              >
                <FiSend className="mr-2" />
                Submit Ticket
              </button>
            </form>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-start">
                    <FiHelpCircle className="text-primary-600 mr-2 flex-shrink-0 mt-0.5" size={16} />
                    {faq.question}
                  </h3>
                  <p className="text-sm text-gray-600 ml-6">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Can't find what you're looking for?{' '}
                <button className="text-primary-600 hover:text-primary-700 font-medium">
                  Contact our support team
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Response Time Stats */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-6">Our Service Commitment</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                &lt;2h
              </div>
              <p className="text-primary-100">Average Response Time</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">98%</div>
              <p className="text-primary-100">Customer Satisfaction</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <p className="text-primary-100">Support Availability</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">10k+</div>
              <p className="text-primary-100">Happy Customers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerService;