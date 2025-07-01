const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, '/')));
app.use(bodyParser.json());

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Validate form data before proceeding to payment
app.post('/api/validate-form', async (req, res) => {
  try {
    const { 
      firstname, 
      lastname, 
      email, 
      phone,
      birthdate,
      startDate,
      endDate,
      finalPrice,
      // Check for required fields
    } = req.body;

    // Validate required fields
    if (!firstname || !lastname || !email || !phone || !birthdate || !startDate || !endDate) {
      return res.status(400).json({ error: 'Certains champs requis sont manquants.' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide.' });
    }
    
    // Validate date format and logic
    try {
      const startDateObj = new Date(startDate.split('/').reverse().join('-'));
      const endDateObj = new Date(endDate.split('/').reverse().join('-'));
      
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({ error: 'Format de date invalide.' });
      }
      
      if (endDateObj < startDateObj) {
        return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début.' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Erreur de validation des dates.' });
    }
    
    // If all validations pass
    return res.status(200).json({ success: true, message: 'Validation réussie' });
  } catch (error) {
    console.error('Error validating form:', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la validation du formulaire.' });
  }
});

// Create a checkout session with Stripe
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { 
      firstname, 
      lastname, 
      email, 
      phone,
      birthdate,
      address,
      profession,
      symptoms,
      symptomDuration,
      startDate,
      endDate,
      longLeave,
      pastDate,
      complexCase,
      urgentOption,
      ssnOption,
      ssnNumber,
      healthCenter,
      medicalHistory,
      additionalNotes,
      finalPrice
    } = req.body;

    // Parse the final price from the form (in euros) to cents
    const calculatedPrice = parseFloat(finalPrice) * 100;
    
    // Fallback calculation in case the finalPrice is missing or invalid
    let basePrice = 2999; // €29.99 in cents
    if (longLeave === true || longLeave === 'true') basePrice += 499; // €4.99 for long leave
    if (pastDate === true || pastDate === 'true') basePrice += 499; // €4.99 for past date
    if (complexCase === true || complexCase === 'true') basePrice += 999; // €9.99 for complex case
    if (urgentOption === true || urgentOption === 'true') basePrice += 1499; // €14.99 for urgent option
    if (ssnOption === true || ssnOption === 'true') basePrice += 499; // €4.99 for SSN option
    
    // Calculate days between dates for duration pricing
    try {
      const startDateObj = new Date(startDate.split('/').reverse().join('-'));
      const endDateObj = new Date(endDate.split('/').reverse().join('-'));
      const diffTime = Math.abs(endDateObj - startDateObj);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      // Add duration surcharge
      if (diffDays > 3 && diffDays <= 7) {
        basePrice += 499; // €4.99 for 4-7 days
      } else if (diffDays > 7 && diffDays <= 14) {
        basePrice += 999; // €9.99 for 8-14 days
      } else if (diffDays > 14) {
        basePrice += 1499; // €14.99 for >14 days
      }
    } catch (error) {
      console.error('Error calculating duration price:', error);
    }
    
    // Use the calculated price from the form if available, otherwise use the fallback
    const finalPriceInCents = isNaN(calculatedPrice) ? basePrice : calculatedPrice;    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Consultation médicale en ligne',
              description: `Consultation du ${startDate} au ${endDate}`,
            },
            unit_amount: finalPriceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/cancel.html`,
      metadata: {
        // Personal information
        firstname,
        lastname,
        email,
        phone,
        birthdate,
        address,
        profession,
        
        // Medical information
        symptoms: JSON.stringify(symptoms),
        symptomDuration,
        
        // Date range
        startDate,
        endDate,
        
        // Options
        longLeave: String(longLeave === true || longLeave === 'true'),
        pastDate: String(pastDate === true || pastDate === 'true'),
        complexCase: String(complexCase === true || complexCase === 'true'),
        urgentOption: String(urgentOption === true || urgentOption === 'true'),
        ssnOption: String(ssnOption === true || ssnOption === 'true'),
        ssnNumber: ssnNumber || '',
        
        // Additional info
        healthCenter,
        medicalHistory,
        additionalNotes,
        
        // Price
        finalPrice: finalPrice || (finalPriceInCents / 100).toFixed(2)
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Webhook to handle Stripe events
app.post('/stripe-webhook', async (req, res) => {
  const payload = req.body;
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Extract user data from metadata
    const userData = session.metadata;
    
    try {
      // Generate PDF certificate
      const pdfBuffer = await generatePdf(userData);
      
      // Send email with PDF attachment
      await sendEmail(pdfBuffer, userData.email, userData);
      
      console.log('Certificate generated and email sent successfully');
    } catch (error) {
      console.error('Error processing order:', error);
    }
  }

  res.status(200).send();
});

// Function to generate PDF certificate
async function generatePdf(userData) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
    // Load the certificate template and replace placeholders
  const certificateTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Certificat Médical</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          max-width: 200px;
        }
        h1 {
          color: #00B9AE;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .certificate {
          border: 2px solid #00B9AE;
          padding: 30px;
          margin: 20px 0;
          position: relative;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          color: rgba(0, 185, 174, 0.1);
          font-size: 100px;
          z-index: -1;
        }
        .info {
          margin-bottom: 20px;
        }
        .doctor-signature {
          text-align: right;
          margin-top: 60px;
        }
        .footer {
          margin-top: 40px;
          font-size: 12px;
          text-align: center;
          color: #666;
        }
        .options {
          margin-top: 20px;
          padding: 15px;
          background-color: #f8f8f8;
          border-radius: 8px;
        }
        .options h3 {
          margin-top: 0;
          color: #00B9AE;
          font-size: 16px;
        }
        .options ul {
          margin: 0;
          padding-left: 20px;
        }
        .urgency-marker {
          display: inline-block;
          padding: 5px 10px;
          background-color: #ff6b6b;
          color: white;
          border-radius: 4px;
          font-weight: bold;
          margin-left: 10px;
        }
        .ssn {
          margin-top: 10px;
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 4px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img class="logo" src="https://medipause.com/assets/logo.png" alt="MediPause Logo">
        <h1>CERTIFICAT MÉDICAL</h1>
      </div>
        <div class="certificate">
        <div class="watermark">MEDIPAUSE</div>
        
        <div class="info">
          <p>Je soussigné, <strong>Dr. Martin Dubois</strong>, médecin inscrit au Conseil National de l'Ordre des Médecins sous le numéro <strong>12345678</strong>, certifie avoir consulté ce jour :</p>
          
          <p><strong>Nom :</strong> ${userData.lastname}</p>
          <p><strong>Prénom :</strong> ${userData.firstname}</p>
          <p><strong>Né(e) le :</strong> ${userData.birthdate}</p>
          <p><strong>Adresse :</strong> ${userData.address}</p>
          <p><strong>Profession :</strong> ${userData.profession}</p>
          ${userData.ssnOption === 'true' && userData.ssnNumber ? `
          <div class="ssn">
            <p><strong>Numéro de sécurité sociale :</strong> ${userData.ssnNumber}</p>
          </div>` : ''}
          
          <p>Cette personne présente un état de santé nécessitant un arrêt de travail :</p>
          <p><strong>du :</strong> ${userData.startDate} <strong>au :</strong> ${userData.endDate} inclus ${userData.urgentOption === 'true' ? '<span class="urgency-marker">URGENT</span>' : ''}.</p>
          
          <p><strong>Symptômes :</strong> ${
            Array.isArray(JSON.parse(userData.symptoms || '[]')) 
              ? JSON.parse(userData.symptoms || '[]').join(', ') 
              : 'Non spécifiés'
          }</p>
          
          ${userData.additionalNotes ? `<p><strong>Observations supplémentaires :</strong> ${userData.additionalNotes}</p>` : ''}
          
          <div class="options">
            <h3>Informations complémentaires</h3>
            <ul>
              <li><strong>Durée des symptômes :</strong> ${userData.symptomDuration || 'Non spécifié'}</li>
              <li><strong>Centre de santé habituel :</strong> ${userData.healthCenter || 'Non spécifié'}</li>
              ${userData.medicalHistory ? `<li><strong>Antécédents médicaux :</strong> ${userData.medicalHistory}</li>` : ''}
              ${userData.complexCase === 'true' ? '<li><strong>Cas médical complexe nécessitant un suivi particulier</strong></li>' : ''}
            </ul>
          </div>
          
          <p>Ce certificat est délivré à l'intéressé pour servir et valoir ce que de droit.</p>
        </div>
        
        <div class="doctor-signature">
          <p>Fait le ${new Date().toLocaleDateString('fr-FR')}</p>
          <p>Dr. Martin Dubois</p>
          <p>Signature électronique sécurisée</p>
          <p>RPPS: 10003456789</p>
        </div>
      </div>
      
      <div class="footer">
        <p>Ce certificat a été émis électroniquement via la plateforme MediPause et est conforme à la législation en vigueur.</p>
        <p>Pour vérifier l'authenticité de ce document, consultez www.medipause.com/verifier</p>
      </div>
    </body>
    </html>
  `;

  await page.setContent(certificateTemplate);
  
  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    }
  });
  
  await browser.close();
  return pdfBuffer;
}

// Function to send email with PDF attachment
async function sendEmail(pdfBuffer, userEmail, userData) {
  // Create reusable transporter object using SMTP transport
  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Send mail with defined transport object
  await transporter.sendMail({
    from: '"MediPause" <support@medipause.com>',
    to: userEmail,
    subject: 'Votre certificat médical - MediPause',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://medipause.com/assets/logo.png" alt="MediPause Logo" style="max-width: 150px;">
        </div>
        
        <h2 style="color: #00B9AE;">Votre certificat médical est prêt</h2>
        
        <p>Bonjour ${userData.firstname} ${userData.lastname},</p>
        
        <p>Nous avons le plaisir de vous informer que votre consultation médicale a été approuvée par notre médecin. Votre certificat d'arrêt de travail est maintenant disponible et a été joint à cet email.</p>
        
        <p><strong>Détails de l'arrêt :</strong></p>
        <ul>
          <li>Période : du ${userData.startDate} au ${userData.endDate}</li>
        </ul>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Rappel important :</strong> Ce certificat est un document officiel à présenter à votre employeur et/ou à votre caisse d'assurance maladie dans les délais légaux.</p>
        </div>
        
        <p>Pour toute question concernant votre certificat ou si vous avez besoin d'assistance, n'hésitez pas à nous contacter à support@medipause.com</p>
        
        <p>Nous vous souhaitons un prompt rétablissement.</p>
        
        <p>Cordialement,<br>L'équipe MediPause</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
          <p>MediPause - 123 Avenue de la Santé, 75001 Paris<br>
          SIRET: 123 456 789 00012<br>
          www.medipause.com</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'certificat-medical.pdf',
        content: pdfBuffer
      }
    ]
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
