// Multi-Step Form Functionality
document.addEventListener('DOMContentLoaded', function() {
    const formSection = document.getElementById('form-section');
    const ctaButton = document.getElementById('cta-button');
    const multiStepForm = document.getElementById('multi-step-form');
    const progressBar = document.querySelector('.progress-bar');
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const formSteps = document.querySelectorAll('.form-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const nextButtons = document.querySelectorAll('.next-step');
    const submitButton = document.getElementById('submit-payment');
    const successModal = document.getElementById('payment-success-modal');
    const closeModalButton = document.getElementById('close-modal');

    let currentStep = 1;
    const totalSteps = formSteps.length;

    // Show form when CTA button is clicked
    if (ctaButton) {
        ctaButton.addEventListener('click', function() {
            formSection.classList.remove('hidden');
            // Scroll to form section
            formSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Initialize form: ensure first step is visible, others are hidden
    function initForm() {
        formSteps.forEach((step, index) => {
            if (index === 0) {
                step.classList.add('active');
                step.classList.remove('hidden');
            } else {
                step.classList.remove('active');
                step.classList.add('hidden');
            }
        });
        updateProgressBar();
    }

    // Update progress bar based on current step
    function updateProgressBar() {
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progress}%`;

        // Update step indicators
        stepIndicators.forEach((indicator, index) => {
            const step = index + 1;
            if (step < currentStep) {
                // Completed step
                indicator.classList.remove('text-gray-400');
                indicator.classList.add('text-primary-teal');
                indicator.querySelector('div').classList.add('bg-[#00B9AE]', 'text-white');
                indicator.querySelector('div').classList.remove('border-gray-300');
            } else if (step === currentStep) {
                // Current step
                indicator.classList.remove('text-gray-400');
                indicator.classList.add('text-primary-teal');
                indicator.querySelector('div').classList.remove('bg-[#00B9AE]', 'text-white');
                indicator.querySelector('div').classList.add('border-[#00B9AE]');
            } else {
                // Future step
                indicator.classList.add('text-gray-400');
                indicator.classList.remove('text-primary-teal');
                indicator.querySelector('div').classList.remove('bg-[#00B9AE]', 'text-white', 'border-[#00B9AE]');
                indicator.querySelector('div').classList.add('border-gray-300');
            }
        });
    }

    // Navigate to a specific step
    function goToStep(step) {
        formSteps.forEach((formStep, index) => {
            if (index + 1 === step) {
                formStep.classList.add('active');
                formStep.classList.remove('hidden');
            } else {
                formStep.classList.remove('active');
                formStep.classList.add('hidden');
            }
        });

        currentStep = step;
        updateProgressBar();
    }    // Initialize Flatpickr date pickers
    if (typeof flatpickr !== 'undefined') {
        // Birthdate picker
        flatpickr('#birthdate', {
            dateFormat: 'd/m/Y',
            maxDate: new Date(),
            locale: 'fr'
        });

        // Start date picker
        const startDatePicker = flatpickr('#start-date', {
            dateFormat: 'd/m/Y',
            minDate: 'today',
            locale: 'fr',
            onChange: function(selectedDates) {
                // Update end date minimum selectable date
                if (selectedDates[0]) {
                    endDatePicker.set('minDate', selectedDates[0]);
                    
                    // Calculate maximum allowed end date (14 days from start by default)
                    const maxDate = new Date(selectedDates[0]);
                    const maxDays = document.getElementById('long-leave').checked ? 30 : 14;
                    maxDate.setDate(maxDate.getDate() + maxDays);
                    endDatePicker.set('maxDate', maxDate);
                    
                    // Update pricing based on date selection
                    updateDateRestrictions();
                    calculatePrice();
                }
            }
        });

        // End date picker
        const endDatePicker = flatpickr('#end-date', {
            dateFormat: 'd/m/Y',
            minDate: 'today',
            locale: 'fr',
            onChange: function(selectedDates) {
                if (selectedDates[0]) {
                    const startDate = startDatePicker.selectedDates[0];
                    if (startDate) {
                        // Calculate days between dates
                        const diffTime = Math.abs(selectedDates[0] - startDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        
                        // Update UI with number of days
                        const daysDisplay = document.getElementById('days-count');
                        if (daysDisplay) {
                            daysDisplay.textContent = diffDays;
                            daysDisplay.parentElement.classList.remove('hidden');
                        }
                        
                        // Update pricing based on duration
                        calculatePrice();
                    }
                }
            }
        });

        // Function to update date restrictions based on options selected
        function updateDateRestrictions() {
            const pastDateOption = document.getElementById('past-date');
            const longLeaveOption = document.getElementById('long-leave');
            const complexCaseOption = document.getElementById('complex-case');
            const urgentOption = document.getElementById('urgent-option');
            
            // Reset to default
            startDatePicker.set('minDate', 'today');
            
            // Past date option logic
            if (pastDateOption && pastDateOption.checked) {
                startDatePicker.set('minDate', null);
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                startDatePicker.set('minDate', twoWeeksAgo);
            }
            
            // Long leave option logic
            if (longLeaveOption && longLeaveOption.checked) {
                // Allow up to 30 days for long leaves instead of 14
                if (startDatePicker.selectedDates[0]) {
                    const maxDate = new Date(startDatePicker.selectedDates[0]);
                    maxDate.setDate(maxDate.getDate() + 30);
                    endDatePicker.set('maxDate', maxDate);
                }
            } else {
                // Reset to standard 14 days max
                if (startDatePicker.selectedDates[0]) {
                    const maxDate = new Date(startDatePicker.selectedDates[0]);
                    maxDate.setDate(maxDate.getDate() + 14);
                    endDatePicker.set('maxDate', maxDate);
                }
            }
            
            // Urgent option logic
            if (urgentOption && urgentOption.checked) {
                // For urgent cases, restrict to max 3 days
                if (startDatePicker.selectedDates[0]) {
                    const maxDate = new Date(startDatePicker.selectedDates[0]);
                    maxDate.setDate(maxDate.getDate() + 3);
                    endDatePicker.set('maxDate', maxDate);
                }
            }
        }
        
        // Register event listeners for option changes
        const optionCheckboxes = document.querySelectorAll('.price-option');
        optionCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateDateRestrictions();
                calculatePrice();
            });
        });
    }

    // Handle "Other symptoms" toggle
    const symptomOther = document.getElementById('symptom-other');
    const otherSymptomsContainer = document.getElementById('other-symptoms-container');
    
    if (symptomOther && otherSymptomsContainer) {
        symptomOther.addEventListener('change', function() {
            if (this.checked) {
                otherSymptomsContainer.classList.remove('hidden');
            } else {
                otherSymptomsContainer.classList.add('hidden');
            }
        });
    }

    // Handle "Other health center" toggle
    const healthCenter = document.getElementById('health-center');
    const otherHealthCenter = document.getElementById('other-health-center');
    
    if (healthCenter && otherHealthCenter) {
        healthCenter.addEventListener('change', function() {
            if (this.value === 'other') {
                otherHealthCenter.classList.remove('hidden');
            } else {
                otherHealthCenter.classList.add('hidden');
            }
        });
    }

    // Handle SSN toggle
    const ssnOption = document.getElementById('ssn-option');
    const ssnContainer = document.getElementById('ssn-container');
    
    if (ssnOption && ssnContainer) {
        ssnOption.addEventListener('change', function() {
            if (this.checked) {
                ssnContainer.classList.remove('hidden');
            } else {
                ssnContainer.classList.add('hidden');
            }
        });
    }

    // Handle price calculation
    const totalPrice = document.getElementById('total-price');
    
    function calculatePrice() {
        let basePrice = 29.99;
        let totalPrice = basePrice;
        let daysCount = 1;
        
        // Get all option elements
        const longLeave = document.getElementById('long-leave');
        const pastDate = document.getElementById('past-date');
        const complexCase = document.getElementById('complex-case');
        const urgentOption = document.getElementById('urgent-option');
        const ssnOption = document.getElementById('ssn-option');
        
        // Get price display elements
        const longLeavePrice = document.querySelector('.long-leave-price');
        const pastDatePrice = document.querySelector('.past-date-price');
        const complexCasePrice = document.querySelector('.complex-case-price');
        const urgentOptionPrice = document.querySelector('.urgent-option-price');
        const ssnOptionPrice = document.querySelector('.ssn-option-price');
        const durationPrice = document.querySelector('.duration-price');
        
        // Calculate duration-based pricing if dates are selected
        const startDatePicker = document.querySelector('#start-date')._flatpickr;
        const endDatePicker = document.querySelector('#end-date')._flatpickr;
        
        if (startDatePicker && startDatePicker.selectedDates[0] && 
            endDatePicker && endDatePicker.selectedDates[0]) {
            
            const startDate = startDatePicker.selectedDates[0];
            const endDate = endDatePicker.selectedDates[0];
            
            // Calculate days between dates
            const diffTime = Math.abs(endDate - startDate);
            daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            // Update display with number of days
            const daysCountElement = document.getElementById('days-count');
            if (daysCountElement) {
                daysCountElement.textContent = daysCount;
            }
            
            // Add duration surcharge if more than 3 days
            let durationSurcharge = 0;
            if (daysCount > 3 && daysCount <= 7) {
                durationSurcharge = 4.99;
            } else if (daysCount > 7 && daysCount <= 14) {
                durationSurcharge = 9.99;
            } else if (daysCount > 14) {
                durationSurcharge = 14.99;
            }
            
            if (durationSurcharge > 0) {
                totalPrice += durationSurcharge;
                
                // Update duration price display
                if (durationPrice) {
                    const durationPriceAmount = document.querySelector('.duration-price-amount');
                    if (durationPriceAmount) {
                        durationPriceAmount.textContent = `${durationSurcharge.toFixed(2)} €`;
                    }
                    durationPrice.classList.remove('hidden');
                    durationPrice.classList.add('flex');
                }
            } else if (durationPrice) {
                durationPrice.classList.add('hidden');
                durationPrice.classList.remove('flex');
            }
        }
        
        // Apply option-based pricing
        if (longLeave && longLeave.checked) {
            totalPrice += 4.99;
            if (longLeavePrice) {
                longLeavePrice.classList.remove('hidden');
                longLeavePrice.classList.add('flex');
            }
        } else if (longLeavePrice) {
            longLeavePrice.classList.add('hidden');
            longLeavePrice.classList.remove('flex');
        }
        
        if (pastDate && pastDate.checked) {
            totalPrice += 4.99;
            if (pastDatePrice) {
                pastDatePrice.classList.remove('hidden');
                pastDatePrice.classList.add('flex');
            }
        } else if (pastDatePrice) {
            pastDatePrice.classList.add('hidden');
            pastDatePrice.classList.remove('flex');
        }
        
        if (complexCase && complexCase.checked) {
            totalPrice += 9.99;
            if (complexCasePrice) {
                complexCasePrice.classList.remove('hidden');
                complexCasePrice.classList.add('flex');
            }
        } else if (complexCasePrice) {
            complexCasePrice.classList.add('hidden');
            complexCasePrice.classList.remove('flex');
        }
        
        if (urgentOption && urgentOption.checked) {
            totalPrice += 14.99;
            if (urgentOptionPrice) {
                urgentOptionPrice.classList.remove('hidden');
                urgentOptionPrice.classList.add('flex');
            }
        } else if (urgentOptionPrice) {
            urgentOptionPrice.classList.add('hidden');
            urgentOptionPrice.classList.remove('flex');
        }
        
        if (ssnOption && ssnOption.checked) {
            totalPrice += 4.99;
            if (ssnOptionPrice) {
                ssnOptionPrice.classList.remove('hidden');
                ssnOptionPrice.classList.add('flex');
            }
        } else if (ssnOptionPrice) {
            ssnOptionPrice.classList.add('hidden');
            ssnOptionPrice.classList.remove('flex');
        }
        
        // Update total price display
        const totalPriceElement = document.getElementById('total-price');
        if (totalPriceElement) {
            totalPriceElement.textContent = `${totalPrice.toFixed(2)} €`;
        }
        
        // Update hidden price field for form submission
        const finalPriceInput = document.getElementById('final-price');
        if (finalPriceInput) {
            finalPriceInput.value = totalPrice.toFixed(2);
        }
        
        return totalPrice;
    }

    // Initialize step navigation
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (currentStep > 1) {
                goToStep(currentStep - 1);
            }
        });
    });

    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            const currentFormStep = document.querySelector(`.form-step[data-step="${currentStep}"]`);
            
            // Simple validation (could be enhanced)
            let isValid = true;
            const requiredFields = currentFormStep.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value) {
                    isValid = false;
                    field.classList.add('border-red-500');
                } else {
                    field.classList.remove('border-red-500');
                }
            });
            
            if (isValid && currentStep < totalSteps) {
                goToStep(currentStep + 1);
                
                // Update price when reaching the payment step
                if (currentStep === 7) {
                    updateTotalPrice();
                }
            }
        });
    });

    // Step indicator clicks
    stepIndicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function() {
            const step = index + 1;
            if (step < currentStep) {
                goToStep(step);
            }
        });
    });    // Handle the pre-payment verification step
    const validateFormBtn = document.getElementById('validate-form');
    if (validateFormBtn) {
        validateFormBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Recalculate price to ensure it's the most current value
            const finalPrice = calculatePrice();
            
            // Update summary information
            updateSummaryStep();
            
            // Move to the payment step
            goToStep(8); // Assume step 8 is the payment step
        });
    }
    
    // Update the summary information before payment
    function updateSummaryStep() {
        // Get user information
        const firstName = document.getElementById('firstname').value;
        const lastName = document.getElementById('lastname').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        
        // Get date information
        const startDatePicker = document.querySelector('#start-date')._flatpickr;
        const endDatePicker = document.querySelector('#end-date')._flatpickr;
        
        let startDateStr = 'Non spécifié';
        let endDateStr = 'Non spécifié';
        let daysCount = 0;
        
        if (startDatePicker && startDatePicker.selectedDates[0]) {
            startDateStr = startDatePicker.input.value;
        }
        
        if (endDatePicker && endDatePicker.selectedDates[0]) {
            endDateStr = endDatePicker.input.value;
        }
        
        if (startDatePicker.selectedDates[0] && endDatePicker.selectedDates[0]) {
            const diffTime = Math.abs(endDatePicker.selectedDates[0] - startDatePicker.selectedDates[0]);
            daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
        
        // Update summary elements
        const userSummary = document.getElementById('user-summary');
        if (userSummary) {
            userSummary.textContent = `${firstName} ${lastName} (${email}, ${phone})`;
        }
        
        const dateSummary = document.getElementById('date-summary');
        if (dateSummary) {
            dateSummary.textContent = `Du ${startDateStr} au ${endDateStr} (${daysCount} jours)`;
        }
        
        // Get all options selected
        const options = [];
        document.querySelectorAll('.price-option:checked').forEach(option => {
            options.push(option.dataset.label || option.name);
        });
        
        const optionsSummary = document.getElementById('options-summary');
        if (optionsSummary) {
            if (options.length > 0) {
                optionsSummary.textContent = options.join(', ');
            } else {
                optionsSummary.textContent = 'Aucune option sélectionnée';
            }
        }
        
        // Make sure SSN is displayed if selected
        const ssnOption = document.getElementById('ssn-option');
        const ssnDisplay = document.getElementById('ssn-summary-container');
        const ssnValue = document.getElementById('ssn-number').value;
        
        if (ssnOption && ssnOption.checked && ssnDisplay) {
            ssnDisplay.classList.remove('hidden');
            const ssnSummary = document.getElementById('ssn-summary');
            if (ssnSummary && ssnValue) {
                ssnSummary.textContent = ssnValue;
            }
        } else if (ssnDisplay) {
            ssnDisplay.classList.add('hidden');
        }
    }

    // Handle form submission and payment
    if (submitButton) {
        submitButton.addEventListener('click', async function(e) {
            e.preventDefault();
            submitButton.disabled = true;
            submitButton.innerHTML = 'Traitement en cours...';

            // Collect all form data
            const formData = new FormData(multiStepForm);
            const formDataObject = {};
            
            formData.forEach((value, key) => {
                // Handle special cases like checkboxes
                if (key === 'symptoms[]') {
                    if (!formDataObject.symptoms) {
                        formDataObject.symptoms = [];
                    }
                    formDataObject.symptoms.push(value);
                } else {
                    formDataObject[key] = value;
                }
            });

            // Add boolean values for all options
            const optionCheckboxes = document.querySelectorAll('.price-option');
            optionCheckboxes.forEach(checkbox => {
                formDataObject[checkbox.id] = checkbox.checked;
            });
            
            // Make sure price is included
            formDataObject.finalPrice = document.getElementById('final-price').value;
            
            try {
                // Validate form on the server side before proceeding to payment
                const validateResponse = await fetch('/api/validate-form', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formDataObject)
                });
                
                const validateResult = await validateResponse.json();
                
                if (!validateResponse.ok) {
                    throw new Error(validateResult.error || 'Validation failed');
                }
                
                // Proceed with creating checkout session
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formDataObject)
                });

                const result = await response.json();
                
                if (response.ok && result.url) {
                    // Redirect to Stripe checkout
                    window.location.href = result.url;
                } else {
                    throw new Error(result.error || 'Une erreur est survenue lors du traitement du paiement.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Une erreur est survenue lors du traitement de votre demande: ' + error.message);
                submitButton.disabled = false;
                submitButton.innerHTML = 'Procéder au paiement';
            }
        });
    }

    // Close success modal
    if (closeModalButton) {
        closeModalButton.addEventListener('click', function() {
            successModal.classList.add('hidden');
        });
    }

    // Initialize the form
    initForm();
    
    // Fix for modal display
    if (successModal) {
        document.querySelectorAll('#payment-success-modal button').forEach(button => {
            button.addEventListener('click', function() {
                successModal.classList.add('hidden');
            });
        });
    }
});
