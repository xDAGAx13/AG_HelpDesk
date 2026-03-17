import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define secrets
const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");

// Email transporter creator (inside handler so secrets are accessible)
const createTransporter = (email, password) =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password,
    },
  });

// Email mappings
const departmentEmails = {
  IT: ["manoj.agarwal@agpolypacks.com"],
  HR: ["supriya.bhushan@agpolypacks.com"],
  Accounts: ["accounts@agpolypacks.com"],
  Admin: ["vipul.kumar@agpolypacks.com"],
  Civil: ["neeraj.singhal@agpolypacks.com"],
  "Plant & Machine Maintenance": ["abhinav.kumar@agpolypacks.com"],
};

const subCategoryEmails = {
  IT: {
    Software: ["it.helpdesk@agpolypacks.com"],
    Hardware: ["it.helpdesk@agpolypacks.com"],
    "New Equipment": ["it.helpdesk@agpolypacks.com"],
    SAP: ["priyank.jain@agpolypacks.com"],
  },
  HR: {
    "Attendance & Payslip": ["hr@agpolypacks.com"],
    Other: ["supriya.bhushan@agpolypacks.com"],
    Hiring: ["hiring@agpolypacks.com"],
  },
  Admin: {
    "General Maintenance": ["admin.agppl@agpolypacks.com"],
    Other: ["admin.agppl@agpolypacks.com"],
  },
  Accounts: {
    Finance: ["aayushi.shah@agpolypacks.com"],
    Other: ["aayushi.shah@agpolypacks.com"],
  },
  "Plant & Machine Maintenance": {
    Masuri: ["maintenance.masuri@agpolypacks.com"],
    Bhovapur: ["maintenanceag@agpolypacks.com"],
    Other: ["abhinav.kumar@agpolypacks.com"],
  },
};

// Password reset function
export const sendPasswordResetLink = onCall(
  {
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
    region: "us-central1",
  },
  async (request) => {
    const { email } = request.data;

    if (!email) {
      throw new HttpsError("invalid-argument", "Email is required.");
    }

    let resetLink;
    try {
      resetLink = await getAuth().generatePasswordResetLink(email);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        // Don't reveal whether the email exists
        return { success: true };
      }
      throw new HttpsError("internal", "Failed to generate reset link.");
    }

    const transporter = createTransporter(
      GMAIL_EMAIL.value(),
      GMAIL_PASSWORD.value(),
    );

    const mailOptions = {
      from: `"AG HelpDesk" <${GMAIL_EMAIL.value()}>`,
      to: email,
      subject: "Reset Your AG HelpDesk Password",
      html: `
        <p>Hello,</p>
        <p>We received a request to reset the password for your AG HelpDesk account.</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}"
            style="background-color:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
        <p>— AG HelpDesk</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("Error sending password reset email:", err);
      throw new HttpsError("internal", "Failed to send reset email.");
    }

    return { success: true };
  },
);

// Ticket creation trigger
export const sendTicketCreationEmail = onDocumentCreated(
  {
    document: "tickets/{department}/all/{ticketId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
    region: "us-central1",
  },
  async (event) => {
    const ticket = event.data.data();
    const {
      department,
      subCategory,
      title,
      description,
      raisedBy,
      issuerEmail,
    } = ticket;

    const ccEmails = departmentEmails[department] || [];
    const subEmails = subCategoryEmails[department]?.[subCategory] || ccEmails;

    const transporter = createTransporter(
      GMAIL_EMAIL.value(),
      GMAIL_PASSWORD.value(),
    );

    const mailOptions = {
      from: `"AG HelpDesk" <${GMAIL_EMAIL.value()}>`,
      to: subEmails.join(","),
      cc: ccEmails.join(","),
      subject: `New Ticket Raised for ${department} Department`,
      html: `
        <h3>A new ticket has been raised</h3>
        <p><strong>Title:</strong> ${title}</p>
        ${subCategory ? `<p><strong>Sub Category:</strong> ${subCategory}</p>` : ""}
        <p><strong>Description:</strong> ${description}</p>
        <p><strong>Raised By:</strong> ${raisedBy}</p>
        <p>Visit <a href="https://main.d2ypwtfukrfewq.amplifyapp.com/">AG HelpDesk</a> to view or take action.</p>
        <p>Not your department? Write a mail to ${issuerEmail} for reformation.</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Creation email sent to ${mailOptions.to}`);
    } catch (error) {
      console.error("Error sending creation email:", error);
    }
  },
);

// Ticket resolution trigger
export const sendResolutionEmail = onDocumentUpdated(
  {
    document: "tickets/{department}/all/{ticketId}",
    secrets: [GMAIL_EMAIL, GMAIL_PASSWORD],
    region: "us-central1",
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === "open" && after.status === "closed") {
      const { title, resolutionComment = "", raisedByUid } = after;

      if (!raisedByUid) {
        console.warn("No raisedByUid found.");
        return;
      }

      const userSnap = await db.collection("users").doc(raisedByUid).get();
      if (!userSnap.exists) {
        console.warn("No user found for raisedByUid:", raisedByUid);
        return;
      }

      const userEmail = userSnap.data().email;
      const transporter = createTransporter(
        GMAIL_EMAIL.value(),
        GMAIL_PASSWORD.value(),
      );

      const mailOptions = {
        from: `"AG HelpDesk" <${GMAIL_EMAIL.value()}>`,
        to: userEmail,
        subject: `Your ticket "${title}" has been resolved`,
        html: `
          <p>Hello,</p>
          <p>Your ticket titled <strong>"${title}"</strong> has been resolved.</p>
          ${
            resolutionComment
              ? `<p><strong>Resolution Comment:</strong> ${resolutionComment}</p>`
              : `<p>No additional comments were added by the handler.</p>`
          }
          <p>Thank you for using the AG HelpDesk.</p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Resolution email sent to ${userEmail}`);
      } catch (err) {
        console.error("Error sending resolution email:", err);
      }
    }
  },
);
