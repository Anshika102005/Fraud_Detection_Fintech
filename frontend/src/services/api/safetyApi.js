/* ============================================================
   FraudGuard AI — Safety & Scam Checker API Service
   Provides safety topics and an AI-driven heuristic scam analyzer.
============================================================ */

import { apiClient } from './client';
import { SAFETY_TOPICS } from '../../data/indianData';

export const safetyApi = {
  async getTopics() {
    try {
      return await apiClient.get('/safety/topics');
    } catch {
      return SAFETY_TOPICS;
    }
  },

  async getTopicById(id) {
    try {
      return await apiClient.get(`/safety/topics/${id}`);
    } catch {
      const found = SAFETY_TOPICS.find((t) => t.id === id);
      if (!found) throw new Error(`Safety topic ${id} not found`);
      return found;
    }
  },

  async checkScam(description) {
    try {
      return await apiClient.post('/safety/scam-check', { text: description });
    } catch {
      const text = (description || '').toLowerCase();

      // Rule-based heuristic pattern evaluation
      let riskLevel = 'MEDIUM';
      let confidence = 82;
      let scamType = 'Potential Social Engineering / Phishing';
      const warningSigns = [];
      const recommendedActions = [
        'Never share OTP, UPI PIN, or bank passwords with anyone.',
        'Do not click on unverified SMS or WhatsApp web links.',
        'Contact the official service provider via their verified mobile application.',
      ];

      if (text.includes('pin') || text.includes('upi') || text.includes('receive') || text.includes('collect')) {
        riskLevel = 'HIGH';
        confidence = 94;
        scamType = 'UPI Collect / Reverse Payment Scam';
        warningSigns.push(
          'Entering a UPI PIN transfers money OUT of your bank account; it is never required to receive money.',
          'Fraudsters use UPI collect requests disguised as cashback or buyers.'
        );
        recommendedActions.unshift('Decline the collect request on your payment app immediately.');
      }

      if (text.includes('block') || text.includes('electricity') || text.includes('suspend') || text.includes('power')) {
        riskLevel = 'HIGH';
        confidence = 96;
        scamType = 'Urgent Utility / Bank Threat Phishing';
        warningSigns.push(
          'Manufactured urgency threatening imminent power disconnect or account freeze.',
          'Call-to-action directs you to call an unofficial personal mobile number or download a link.'
        );
        recommendedActions.unshift('Do NOT pay or call the number in the SMS. Check your official electricity or bank app.');
      }

      if (text.includes('telegram') || text.includes('like') || text.includes('job') || text.includes('task') || text.includes('deposit')) {
        riskLevel = 'HIGH';
        confidence = 95;
        scamType = 'Part-Time Work / Telegram Task Scam';
        warningSigns.push(
          'Unsolicited work-from-home offers demanding advance deposit to unlock high payout tasks.',
          'Legitimate employers never demand money from candidates to work.'
        );
        recommendedActions.unshift('Stop communicating and do not send any deposit money. Block the contact.');
      }

      if (text.includes('anydesk') || text.includes('teamviewer') || text.includes('rustdesk') || text.includes('screen') || text.includes('quicksupport')) {
        riskLevel = 'CRITICAL';
        confidence = 98;
        scamType = 'Remote Access Device Hijacking';
        warningSigns.push(
          'Remote desktop apps grant fraudsters full real-time visibility into your device screen and incoming OTPs.',
          'Customer support agents NEVER require screen sharing for refunds or KYC.'
        );
        recommendedActions.unshift('Uninstall the remote software immediately and disconnect internet / Wi-Fi.');
      }

      if (text.includes('arrest') || text.includes('police') || text.includes('cbi') || text.includes('customs') || text.includes('skype')) {
        riskLevel = 'CRITICAL';
        confidence = 99;
        scamType = 'Digital Arrest / Law Enforcement Impersonation';
        warningSigns.push(
          'Indian law has NO concept of "Digital Arrest". Police and CBI never hold interrogations over WhatsApp or Skype.',
          'Threats of prosecution designed to coerce emergency funds transfer.'
        );
        recommendedActions.unshift('Hang up immediately. Dial 1930 or lodge a complaint on cybercrime.gov.in.');
      }

      if (warningSigns.length === 0) {
        warningSigns.push(
          'Unusual unsolicited communication requesting action or financial disclosure.',
          'Pressure tactics or requests to bypass official customer support channels.'
        );
      }

      return {
        query: description,
        riskLevel,
        scamType,
        confidence,
        warningSigns,
        recommendedActions,
        disclaimer:
          'FraudGuard AI provides educational guidance based on recognized fraud patterns and does not guarantee that an inquiry is fraudulent or safe. When in doubt, consult official financial authorities.',
      };
    }
  },
};
