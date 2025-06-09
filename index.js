const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const axios = require('axios');

const app = express();
// No need for PORT here, Vercel handles it
// const PORT = process.env.PORT || 3000; // Remove or comment this line

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from 'public' folder
// IMPORTANT: For static files, you might need to adjust Vercel's build settings or serve them
// differently. If your frontend is making direct requests for .html, .js, .css files,
// ensure they are in the root or a 'public' directory at the root of your project,
// and not trying to be served by this serverless function.
// This line below (app.use(express.static...)) is for serving static files *from this Express server*.
// If your frontend is also hosted on Vercel as static assets, this line might not be needed
// or could conflict. For a basic setup, keep your index.html, script.js, style.css at the root
// of your project, and they will be served as static assets by Vercel by default.
// If you intend for the serverless function to serve them, you'd need a vercel.json config.
// For now, assume index.html, script.js, style.css are static assets at the root.
app.use(express.static(path.join(__dirname, 'public')));


// Email transporter setup (Gmail example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-email-password'
    }
});

// Appointment booking route
app.post('/api/book-appointment', (req, res) => {
    const { patientEmail, doctorEmail, doctorName, timeSlot } = req.body;

    if (!patientEmail || !doctorEmail || !doctorName || !timeSlot) {
        console.error('Missing fields:', { patientEmail, doctorEmail, doctorName, timeSlot });
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const patientMailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: patientEmail,
        subject: 'Appointment Confirmation',
        text: `Your appointment with ${doctorName} at ${timeSlot} has been confirmed.`
    };

    const doctorMailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: doctorEmail,
        subject: 'New Appointment Booking',
        text: `You have a new appointment at ${timeSlot} with patient ${patientEmail}.`
    };

    Promise.all([
        new Promise((resolve, reject) => {
            transporter.sendMail(patientMailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending patient email:', error);
                    reject(error);
                } else {
                    console.log('Patient email sent:', info.response);
                    resolve(info);
                }
            });
        }),
        new Promise((resolve, reject) => {
            transporter.sendMail(doctorMailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending doctor email:', error);
                    reject(error);
                } else {
                    console.log('Doctor email sent:', info.response);
                    resolve(info);
                }
            });
        })
    ])
        .then(() => {
            res.json({ success: true, message: 'Appointment booked successfully' });
        })
        .catch(error => {
            console.error('Error sending emails:', error);
            res.status(500).json({ success: false, error: 'Failed to send confirmation emails' });
        });
});

// Simple in-memory conversation state
let conversationState = {
    stage: 0,
    userName: null,
    userEmail: null,
    selectedSpecialty: null,
    selectedDoctor: null,
    isMedicalInquiry: false
};

// Email validation function
function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
}

// Sanitize string for safe use in onclick
function sanitizeString(str) {
    return str.replace(/"/g, '\\"').replace(/\n/g, '');
}

// Normalize string for comparison
function normalizeString(str) {
    if (!str) return '';
    return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

// Normalize time slot specifically
function normalizeTimeSlot(str) {
    if (!str) return '';
    return str.trim().replace(/[^0-9: AMPM]/gi, '').replace(/\s+/g, ' ');
}

// Appointment-related keywords/phrases
const appointmentKeywords = [
    'book appointment', 'schedule appointment', 'make appointment',
    'book a visit', 'schedule a visit', 'arrange appointment',
    'need to see a doctor', 'want to see a doctor', 'book with doctor',
    'schedule with doctor', 'appointment with doctor', 'see a specialist',
    'visit a doctor', 'consult a doctor', 'meet a doctor'
];

// Greeting keywords
const greetingKeywords = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon',
    'good evening', 'howdy', 'yo', 'hola'
];

// Check if message is a greeting
function isGreeting(message) {
    const normalizedMessage = normalizeString(message);
    return greetingKeywords.some(keyword => normalizedMessage.includes(keyword));
}

// Check if message indicates intent to book an appointment
function isAppointmentRelated(message) {
    const normalizedMessage = normalizeString(message);
    return appointmentKeywords.some(keyword => normalizedMessage.includes(keyword));
}

// Expanded medical-related keywords
const medicalKeywords = [
    'symptom', 'disease', 'condition', 'treatment', 'medication', 'diagnosis',
    'pain', 'fever', 'infection', 'injury', 'surgery', 'therapy', 'health',
    'illness', 'doctor', 'hospital', 'medicine', 'prescription', 'allergy',
    'chronic', 'acute', 'virus', 'bacteria', 'cancer', 'diabetes', 'heart',
    'blood', 'pressure', 'stroke', 'asthma', 'arthritis', 'mental', 'depression',
    'anxiety', 'vaccine', 'immune', 'flu', 'cold', 'cough', 'headache', 'migraine',
    'nausea', 'fatigue', 'rash', 'swelling', 'inflammation', 'bleeding', 'bruise',
    'fracture', 'sprain', 'strain', 'tumor', 'ulcer', 'seizure', 'dizziness',
    'shortness', 'breath', 'chest', 'abdomen', 'kidney', 'liver', 'lung',
    'thyroid', 'hormone', 'insulin', 'cholesterol', 'allergic', 'reaction',
    'antibiotics', 'antiviral', 'painkiller', 'syringe', 'injection', 'scan',
    'xray', 'mri', 'ultrasound', 'biopsy', 'chemotherapy', 'radiation', 'dialysis',
    'transplant', 'immune', 'system', 'autoimmune', 'rheumatoid', 'psoriasis',
    'eczema', 'hypertension', 'hypotension', 'anemia', 'leukemia', 'lymphoma',
    'epilepsy', 'parkinson', 'alzheimer', 'concussion', 'obesity', 'malnutrition',
    'vitamin', 'deficiency', 'legs pain', 'hand pain', 'back pain', 'knee pain',
    'eyes related problem', 'eye pain', 'vision loss', 'blurred vision', 'glaucoma',
    'cataract', 'conjunctivitis', 'dry eyes', 'retina', 'cornea', 'neck pain',
    'shoulder pain', 'elbow pain', 'wrist pain', 'hip pain', 'ankle pain',
    'foot pain', 'joint pain', 'muscle pain', 'numbness', 'tingling', 'cramp',
    'spasm', 'stiffness', 'sciatica', 'tendonitis', 'bursitis', 'gout',
    'osteoporosis', 'scoliosis', 'hernia', 'disc slip', 'sinus', 'sinusitis',
    'sore throat', 'tonsillitis', 'laryngitis', 'bronchitis', 'pneumonia',
    'tuberculosis', 'emphysema', 'copd', 'gastritis', 'acid reflux', 'gerd',
    'constipation', 'diarrhea', 'ibs', 'crohn', 'colitis', 'appendicitis',
    'gallstone', 'pancreatitis', 'hepatitis', 'cirrhosis', 'bladder', 'uti',
    'kidney stone', 'prostate', 'incontinence', 'menopause', 'pms', 'endometriosis',
    'fibroid', 'infertility', 'erectile', 'dysfunction', 'std', 'hiv', 'herpes',
    'hpv', 'syphilis', 'gonorrhea', 'chlamydia', 'acne', 'rosacea', 'dandruff',
    'alopecia', 'hives', 'warts', 'mole', 'melanoma', 'basal cell', 'squamous',
    'psoriatic', 'lupus', 'scleroderma', 'vitiligo', 'insomnia', 'sleep apnea',
    'narcolepsy', 'restless legs', 'phobia', 'ocd', 'ptsd', 'bipolar', 'schizophrenia',
    'addiction', 'detox', 'rehab', 'anorexia', 'bulimia', 'binge eating', 'vertigo',
    'tinnitus', 'hearing loss', 'ear infection', 'meningitis', 'encephalitis',
    'hydrocephalus', 'aneurysm', 'hemorrhage', 'clot', 'angina', 'arrhythmia',
    'cardiomyopathy', 'stent', 'bypass', 'pacemaker', 'endoscopy', 'colonoscopy',
    'mammogram', 'pap smear', 'prostate exam', 'blood test', 'urine test',
    'stool test', 'ecg', 'eeg', 'ct scan', 'pet scan', 'ventilator', 'oxygen therapy'
];

// Check if message contains medical-related keywords
function isMedicalRelated(message) {
    const normalizedMessage = normalizeString(message);
    console.log('Checking medical keywords in:', normalizedMessage);
    const matchedKeywords = medicalKeywords.filter(keyword => normalizedMessage.includes(keyword));
    console.log('Matched medical keywords:', matchedKeywords);
    return matchedKeywords.length > 0;
}

// Grok API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// IMPORTANT: This API key should be an environment variable on Vercel!
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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"; // Change this
const GROQ_MODEL = "llama3-70b-8192";

// Function to query Grok API
async function queryGrokAPI(question) {
    try {
        const response = await axios.post(GROQ_API_URL, {
            model: GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a medical information assistant. Provide accurate and concise answers to medical-related questions, limiting responses to approximately 10 lines. Do not provide personal medical advice or diagnoses, but offer general information. If the question is unclear or not medical-related, politely redirect the user to ask a relevant medical question."
                },
                {
                    role: "user",
                    content: question
                }
            ],
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Grok API response:', response.data.choices[0].message.content.trim());
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Grok API error:', error.message, error.response ? error.response.data : '');
        return "Sorry, I couldn't process your medical question at this time. Please try again or ask another question.";
    }
}

// List of specialties (keep original case for display)
const specialties = [
    'Cardiology', 'Neurology', 'Pulmonology', 'Gastroenterology',
    'Nephrology', 'Endocrinology', 'Oncology', 'Hematology',
    'Dermatology', 'Psychiatry'
];

// Normalized specialties for comparison
const normalizedSpecialties = specialties.map(s => normalizeString(s));

// List of doctors per specialty with fictional emails
const doctors = {
    'Cardiology': [
        { name: 'Dr. Somasekar', email: 'somasekar@example.com' },
        { name: 'Dr. Poovarasan', email: 'poovarasan@example.com' }
    ],
    'Neurology': [
        { name: 'Dr. Anjali Sharma', email: 'anjali.sharma@example.com' },
        { name: 'Dr. Vikram Patel', email: 'vikram.patel@example.com' }
    ],
    'Pulmonology': [
        { name: 'Dr. Priya Menon', email: 'priya.menon@example.com' },
        { name: 'Dr. Sanjay Gupta', email: 'sanjay.gupta@example.com' }
    ],
    'Gastroenterology': [
        { name: 'Dr. Rajesh Nair', email: 'rajesh.nair@example.com' },
        { name: 'Dr. Meena Iyer', email: 'meena.iyer@example.com' }
    ],
    'Nephrology': [
        { name: 'Dr. Arjun Reddy', email: 'arjun.reddy@example.com' },
        { name: 'Dr. Lakshmi Rao', email: 'lakshmi.rao@example.com' }
    ],
    'Endocrinology': [
        { name: 'Dr. Kavita Desai', email: 'kavita.desai@example.com' },
        { name: 'Dr. Mohan Kumar', email: 'mohan.kumar@example.com' }
    ],
    'Oncology': [
        { name: 'Dr. Siddharth Bose', email: 'siddharth.bose@example.com' },
        { name: 'Dr. Nisha Verma', email: 'nisha.verma@example.com' }
    ],
    'Hematology': [
        { name: 'Dr. Anil Kapoor', email: 'anil.kapoor@example.com' },
        { name: 'Dr. Sunita Pillai', email: 'sunita.pillai@example.com' }
    ],
    'Dermatology': [
        { name: 'Dr. Riya Sen', email: 'riya.sen@example.com' },
        { name: 'Dr. Amitabh Das', email: 'amitabh.das@example.com' }
    ],
    'Psychiatry': [
        { name: 'Dr. Shalini Mehta', email: 'shalini.mehta@example.com' },
        { name: 'Dr. Rohan Joshi', email: 'rohan.joshi@example.com' }
    ]
};

// Available time slots
const timeSlots = ['10:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

// Chatbot API
app.post('/api/chat', async (req, res) => {
    console.log('Raw request body:', req.body);
    const { message } = req.body;
    console.log('Received message:', message, 'Current stage:', conversationState.stage, 'Conversation state:', conversationState);

    if (!message && message !== 'start' && message !== 'end') {
        console.error('No message provided');
        return res.status(400).json({ error: 'No message provided' });
    }

    // Reset conversation state on 'start' or 'end'
    if (message === 'start' || message === 'end') {
        conversationState = {
            stage: 0,
            userName: null,
            userEmail: null,
            selectedSpecialty: null,
            selectedDoctor: null,
            isMedicalInquiry: false
        };
        console.log('Conversation reset:', conversationState);
        if (message === 'end') {
            return res.json({
                reply: '',
                buttons: [],
                disableInput: false,
                hideInput: false,
                isMedicalInquiry: false,
                silent: true
            });
        }
    }

    let reply = '';
    let buttons = [];
    let disableInput = false;
    let hideInput = false;
    let isMedicalInquiry = conversationState.isMedicalInquiry;

    try {
        // Check for greetings first
        if (message !== 'start' && message !== 'end' && message !== 'return_back' && isGreeting(message)) {
            console.log('Greeting detected:', message);
            reply = "Hello! How can I assist you today?";
            if (conversationState.stage === 0 || conversationState.stage === 1) {
                reply = "Hi there! May I know your name?";
                conversationState.stage = 2;
            } else if (conversationState.stage === 2) {
                reply = "Hello! Please provide your name.";
            } else if (conversationState.stage === 3) {
                reply = `Hi ${conversationState.userName}! Please share your email ID.`;
            } else if (conversationState.stage === 4) {
                reply = "Greetings! Do you want to book an appointment or ask a medical-related question?";
                buttons = [
                    { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                    { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                    { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                ];
                hideInput = true;
            } else if (conversationState.stage === 5) {
                reply = "Hi! Please select a specialty or return back:";
                buttons = [
                    ...specialties.map(specialty => ({
                        text: specialty,
                        class: 'specialty-button',
                        onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")`
                    })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 6) {
                reply = `Hello! Please select a doctor for ${conversationState.selectedSpecialty} or return back:`;
                buttons = [
                    ...doctors[conversationState.selectedSpecialty].map(doctor => ({
                        text: doctor.name,
                        class: 'specialty-button',
                        onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                    })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 7) {
                reply = `Hi! Please select a time slot for ${conversationState.selectedDoctor} or return back:`;
                buttons = [
                    ...timeSlots.map(timeSlot => ({
                        text: timeSlot,
                        class: 'time-slot-button',
                        onclick: `handleTimeSlotSelect("${sanitizeString(timeSlot)}","${sanitizeString(conversationState.selectedDoctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                    })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 8) {
                reply = "Hello! Your appointment is confirmed. To book another or ask a question, please start over.";
                buttons = [];
                disableInput = true;
                hideInput = true;
            } else if (conversationState.stage === 9) {
                reply = "Hello! I'm here to help with your medical questions. Please ask something like 'What causes leg pain?' or select 'Return Back'.";
                buttons = [
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = false;
                hideInput = false;
                isMedicalInquiry = true;
            }
        }
        // Check for appointment intent
        else if (message !== 'start' && message !== 'end' && message !== 'return_back' && isAppointmentRelated(message)) {
            console.log('Appointment intent detected:', message);
            if (!conversationState.userName) {
                reply = "May I know your name?";
                conversationState.stage = 2;
            } else if (!conversationState.userEmail) {
                reply = `Hi ${conversationState.userName}! Can you please send your email ID for communication?`;
                conversationState.stage = 3;
            } else {
                reply = "Please select a specialty or return back:";
                buttons = [
                    ...specialties.map(specialty => ({ text: specialty, class: 'specialty-button', onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")` })),
                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                ];
                disableInput = true;
                hideInput = true;
                conversationState.stage = 5;
                conversationState.isMedicalInquiry = false;
            }
        } else {
            // Existing stage-based logic
            switch (conversationState.stage) {
                case 0:
                    reply = "How can I assist you today?";
                    conversationState.stage = 1;
                    break;
                case 1:
                    reply = "May I know your name?";
                    conversationState.stage = 2;
                    break;
                case 2: // User provides name
                    if (message.length < 2) {
                        reply = "Please provide a valid name.";
                    } else {
                        conversationState.userName = message;
                        reply = `Hi ${conversationState.userName}! Can you please send your email ID for communication?`;
                        conversationState.stage = 3;
                    }
                    break;
                case 3: // User provides email
                    if (!isValidEmail(message)) {
                        reply = "Please enter a valid email address.";
                    } else {
                        conversationState.userEmail = message;
                        reply = "Thanks! Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                        conversationState.stage = 4;
                    }
                    break;
                case 4: // User selects option after providing email
                    const normalizedMessage = normalizeString(message);
                    if (normalizedMessage === 'yes' || isAppointmentRelated(message)) {
                        reply = "Please select a specialty or return back:";
                        buttons = [
                            ...specialties.map(specialty => ({ text: specialty, class: 'specialty-button', onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")` })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                        conversationState.stage = 5;
                        conversationState.isMedicalInquiry = false;
                    } else if (normalizedMessage === 'no') {
                        reply = "Okay, if you change your mind, just say 'hello' or 'book appointment'.";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                        conversationState.stage = 4;
                    } else if (normalizedMessage === 'medical_inquiry' || isMedicalRelated(message)) {
                        reply = "Please ask your medical-related question:";
                        buttons = [
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = false;
                        hideInput = false;
                        conversationState.stage = 9;
                        conversationState.isMedicalInquiry = true;
                    } else {
                        reply = "I didn't understand. Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                    }
                    break;
                case 5: // User selects specialty
                    if (message.startsWith('select_specialty:')) {
                        const selectedSpecialty = message.substring('select_specialty:'.length);
                        const normalizedSelectedSpecialty = normalizeString(selectedSpecialty);
                        const matchedSpecialty = normalizedSpecialties.find(s => s === normalizedSelectedSpecialty);

                        if (matchedSpecialty) {
                            const originalSpecialty = specialties.find(s => normalizeString(s) === matchedSpecialty);
                            conversationState.selectedSpecialty = originalSpecialty;
                            const availableDoctors = doctors[originalSpecialty];
                            if (availableDoctors && availableDoctors.length > 0) {
                                reply = `Great! Here are the doctors available for ${originalSpecialty}:`;
                                buttons = [
                                    ...availableDoctors.map(doctor => ({
                                        text: doctor.name,
                                        class: 'specialty-button',
                                        onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(originalSpecialty)}")`
                                    })),
                                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                                ];
                                disableInput = true;
                                hideInput = true;
                                conversationState.stage = 6;
                            } else {
                                reply = `No doctors found for ${originalSpecialty}. Please select another specialty or return back:`;
                                buttons = [
                                    ...specialties.map(specialty => ({ text: specialty, class: 'specialty-button', onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")` })),
                                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                                ];
                                disableInput = true;
                                hideInput = true;
                            }
                        } else {
                            reply = "Invalid specialty selected. Please choose from the list or return back:";
                            buttons = [
                                ...specialties.map(specialty => ({ text: specialty, class: 'specialty-button', onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")` })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                        }
                    } else if (normalizeString(message) === 'return_back') {
                        reply = "Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                        conversationState.stage = 4;
                    } else {
                        reply = "Please select a specialty from the list or return back:";
                        buttons = [
                            ...specialties.map(specialty => ({ text: specialty, class: 'specialty-button', onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")` })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                    }
                    break;
                case 6: // User selects doctor
                    if (message.startsWith('select_doctor:')) {
                        const parts = message.substring('select_doctor:'.length).split(':');
                        const selectedDoctorName = parts[0];
                        const selectedSpecialty = parts[1]; // Get original specialty from message

                        if (conversationState.selectedSpecialty && doctors[conversationState.selectedSpecialty]) {
                            const doctor = doctors[conversationState.selectedSpecialty].find(d => normalizeString(d.name) === normalizeString(selectedDoctorName));
                            if (doctor) {
                                conversationState.selectedDoctor = doctor;
                                reply = `You selected ${doctor.name}. Now, please choose an available time slot:`;
                                buttons = [
                                    ...timeSlots.map(slot => ({
                                        text: slot,
                                        class: 'time-slot-button',
                                        onclick: `handleTimeSlotSelect("${sanitizeString(slot)}","${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                                    })),
                                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                                ];
                                disableInput = true;
                                hideInput = true;
                                conversationState.stage = 7;
                            } else {
                                reply = `Doctor "${selectedDoctorName}" not found for ${conversationState.selectedSpecialty}. Please select a doctor from the list or return back:`;
                                buttons = [
                                    ...doctors[conversationState.selectedSpecialty].map(doctor => ({ text: doctor.name, class: 'specialty-button', onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")` })),
                                    { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                                ];
                                disableInput = true;
                                hideInput = true;
                            }
                        } else {
                            reply = "It seems like the specialty was not properly selected. Please return back and try again.";
                            buttons = [
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                        }
                    } else if (normalizeString(message) === 'return_back') {
                        reply = "Please select a specialty or return back:";
                        buttons = [
                            ...specialties.map(specialty => ({ text: specialty, class: 'specialty-button', onclick: `handleSpecialtySelect("${sanitizeString(specialty)}")` })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                        conversationState.stage = 5;
                    } else {
                        reply = "Please select a doctor from the list or return back:";
                        buttons = [
                            ...doctors[conversationState.selectedSpecialty].map(doctor => ({ text: doctor.name, class: 'specialty-button', onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")` })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                    }
                    break;
                case 7: // User selects time slot
                    if (message.startsWith('select_timeslot:')) {
                        const parts = message.substring('select_timeslot:'.length).split(':');
                        const selectedTimeSlot = normalizeTimeSlot(parts[0]); // Normalize the selected time slot
                        const doctorName = parts[1];
                        const specialty = parts[2];

                        if (timeSlots.some(slot => normalizeTimeSlot(slot) === selectedTimeSlot)) {
                            reply = `Okay, you want to book an appointment with ${doctorName} for ${specialty} at ${selectedTimeSlot}. Please confirm to finalize.`;
                            buttons = [
                                { text: 'Confirm', class: 'chat-button', onclick: `handleConfirmAppointment("${sanitizeString(conversationState.userEmail)}","${sanitizeString(conversationState.selectedDoctor.email)}","${sanitizeString(doctorName)}","${sanitizeString(selectedTimeSlot)}")` },
                                { text: 'Cancel', class: 'chat-button', onclick: 'handleCancelAppointment()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                            conversationState.stage = 8;
                        } else {
                            reply = "Invalid time slot selected. Please choose from the list or return back:";
                            buttons = [
                                ...timeSlots.map(slot => ({
                                    text: slot,
                                    class: 'time-slot-button',
                                    onclick: `handleTimeSlotSelect("${sanitizeString(slot)}","${sanitizeString(conversationState.selectedDoctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                                })),
                                { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                            ];
                            disableInput = true;
                            hideInput = true;
                        }
                    } else if (normalizeString(message) === 'return_back') {
                        reply = `Please select a doctor for ${conversationState.selectedSpecialty} or return back:`;
                        buttons = [
                            ...doctors[conversationState.selectedSpecialty].map(doctor => ({ text: doctor.name, class: 'specialty-button', onclick: `handleDoctorSelect("${sanitizeString(doctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")` })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                        conversationState.stage = 6;
                    } else {
                        reply = "Please select a time slot or return back:";
                        buttons = [
                            ...timeSlots.map(slot => ({
                                text: slot,
                                class: 'time-slot-button',
                                onclick: `handleTimeSlotSelect("${sanitizeString(slot)}","${sanitizeString(conversationState.selectedDoctor.name)}","${sanitizeString(conversationState.selectedSpecialty)}")`
                            })),
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                    }
                    break;
                case 8: // User confirms or cancels appointment
                    if (normalizeString(message) === 'confirm_appointment') {
                        reply = "Booking your appointment...";
                        // The actual email sending logic is in the /api/book-appointment route.
                        // Frontend needs to trigger that separately after this confirmation.
                        // Here, we just acknowledge and prepare for next stage.
                        conversationState.stage = 0; // Reset for a new interaction
                        hideInput = true;
                        disableInput = true; // Disable input while confirmation is being processed
                    } else if (normalizeString(message) === 'cancel_appointment') {
                        reply = "Appointment cancelled. How else can I help?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                        conversationState.stage = 4; // Go back to main choice
                    } else {
                        reply = "Please confirm or cancel your appointment.";
                        buttons = [
                            { text: 'Confirm', class: 'chat-button', onclick: `handleConfirmAppointment("${sanitizeString(conversationState.userEmail)}","${sanitizeString(conversationState.selectedDoctor.email)}","${sanitizeString(conversationState.selectedDoctor.name)}","${sanitizeString(normalizeTimeSlot(message))}")` },
                            { text: 'Cancel', class: 'chat-button', onclick: 'handleCancelAppointment()' }
                        ];
                        disableInput = true;
                        hideInput = true;
                    }
                    break;
                case 9: // Medical inquiry stage
                    if (isMedicalRelated(message) || message !== 'return_back') {
                        reply = await queryGrokAPI(message);
                        buttons = [
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = false;
                        hideInput = false;
                        isMedicalInquiry = true;
                    } else if (normalizeString(message) === 'return_back') {
                        reply = "Do you want to book an appointment or ask a medical-related question?";
                        buttons = [
                            { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                            { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                            { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                        ];
                        hideInput = true;
                        conversationState.stage = 4;
                        isMedicalInquiry = false;
                    } else {
                        reply = "I'm not sure how to respond. Please ask a medical-related question or select 'Return Back'.";
                        buttons = [
                            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
                        ];
                        disableInput = false;
                        hideInput = false;
                        isMedicalInquiry = true;
                    }
                    break;
                default:
                    console.error('Invalid stage:', conversationState.stage);
                    reply = "Do you want to book an appointment or ask a medical-related question?";
                    buttons = [
                        { text: 'Yes', class: 'chat-button', onclick: 'handleYesNo("Yes")' },
                        { text: 'No', class: 'chat-button', onclick: 'handleYesNo("No")' },
                        { text: 'Ask Medical Related', class: 'chat-button', onclick: 'handleMedicalInquiry()' }
                    ];
                    hideInput = true;
                    conversationState.stage = 4;
                    conversationState.isMedicalInquiry = false;
            }
        }
    } catch (error) {
        console.error('Server error in /api/chat:', error.message);
        reply = `Server error: ${error.message}. Please try again.`;
        buttons = [
            { text: 'Return Back', class: 'return-back-button', onclick: 'handleReturnBack()' }
        ];
        disableInput = true;
        hideInput = true;
        conversationState.stage = 4;
        conversationState.isMedicalInquiry = false;
    }

    // Send response
    console.log('Sending response:', { reply, buttons: buttons.map(b => b.text), isMedicalInquiry });
    res.json({ reply, buttons, disableInput, hideInput, isMedicalInquiry });
});

// IMPORTANT: Add this line at the very end for Vercel to recognize your Express app!
module.exports = app;