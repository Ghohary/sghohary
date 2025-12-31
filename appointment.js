// Appointment Page Functionality
(function() {
    'use strict';

    // Check if user is logged in, redirect to auth-gate if not
    const currentUser = JSON.parse(localStorage.getItem('ghoharyCurrentUser') || 'null');
    if (!currentUser || !currentUser.email) {
        window.location.href = 'auth-gate.html';
        return;
    }

    // Set minimum date to today
    const dateInput = document.getElementById('apptDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }

    // Time slot selection
    const timeSlots = document.querySelectorAll('.time-slot');
    let selectedTime = null;

    timeSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            timeSlots.forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
            selectedTime = this.dataset.time;
        });
    });

    // Form submission
    const appointmentForm = document.getElementById('appointmentForm');
    
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate time slot selection
            if (!selectedTime) {
                alert('Please select a preferred time slot');
                return;
            }

            // Get form data
            const formData = {
                firstName: document.getElementById('apptFirstName').value,
                lastName: document.getElementById('apptLastName').value,
                email: document.getElementById('apptEmail').value,
                phone: document.getElementById('apptPhone').value,
                type: document.querySelector('input[name="consultationType"]:checked').value,
                date: document.getElementById('apptDate').value,
                time: selectedTime,
                eventDate: document.getElementById('eventDate').value,
                budget: document.getElementById('budget').value,
                message: document.getElementById('message').value,
                timestamp: new Date().toISOString()
            };

            // Store appointment (in real app, this would be sent to server)
            const appointments = JSON.parse(localStorage.getItem('ghoharyAppointments') || '[]');
            appointments.push(formData);
            localStorage.setItem('ghoharyAppointments', JSON.stringify(appointments));

            // Show success modal
            document.getElementById('appointmentModal').style.display = 'flex';

            // Reset form
            appointmentForm.reset();
            timeSlots.forEach(s => s.classList.remove('selected'));
            selectedTime = null;
        });
    }

    // Close modal
    const modal = document.getElementById('appointmentModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Update cart count
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('ghoharyCart') || '[]');
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    updateCartCount();

    console.log('Appointment page loaded');
})();
