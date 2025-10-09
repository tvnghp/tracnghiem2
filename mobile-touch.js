// Mobile Touch Enhancements for Quiz App
// Optimized touch interactions and mobile gestures

(function() {
  'use strict';

  // Add touch device class
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
  }
  
  // Detect Android devices
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isChrome = /Chrome/i.test(navigator.userAgent);
  const isWebView = /wv/i.test(navigator.userAgent);
  
  if (isAndroid) {
    document.body.classList.add('android-device');
    if (isChrome) document.body.classList.add('android-chrome');
    if (isWebView) document.body.classList.add('android-webview');
  }

  // Prevent zoom on double tap for buttons and interactive elements
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Enhanced touch feedback for buttons
  function addTouchFeedback(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.addEventListener('touchstart', function() {
        this.classList.add('touch-active');
        this.style.transform = 'scale(0.95)';
        this.style.transition = 'transform 0.1s ease';
        
        // Android specific haptic feedback
        if (isAndroid && 'vibrate' in navigator) {
          navigator.vibrate(10);
        }
      });
      
      element.addEventListener('touchend', function() {
        this.classList.remove('touch-active');
        this.style.transform = '';
        setTimeout(() => {
          this.style.transition = '';
        }, 100);
      });
      
      element.addEventListener('touchcancel', function() {
        this.classList.remove('touch-active');
        this.style.transform = '';
        this.style.transition = '';
      });
    });
  }

  // Enhanced touch feedback for answers
  function addAnswerTouchFeedback() {
    const answers = document.querySelectorAll('.answer');
    answers.forEach(answer => {
      answer.addEventListener('touchstart', function() {
        this.classList.add('touch-active');
        this.style.transform = 'scale(0.98)';
        this.style.transition = 'transform 0.1s ease';
      });
      
      answer.addEventListener('touchend', function() {
        this.classList.remove('touch-active');
        this.style.transform = '';
        setTimeout(() => {
          this.style.transition = '';
        }, 100);
      });
      
      answer.addEventListener('touchcancel', function() {
        this.classList.remove('touch-active');
        this.style.transform = '';
        this.style.transition = '';
      });
    });
  }

  // Swipe gestures for quiz navigation
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;

  function handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndX - touchStartX;
    const verticalDistance = Math.abs(touchEndY - touchStartY);
    
    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(swipeDistance) > swipeThreshold && verticalDistance < 100) {
      if (swipeDistance > 0) {
        // Swipe right - previous question
        const prevBtn = document.getElementById('prev-btn') || document.querySelector('.btn-prev');
        if (prevBtn && !prevBtn.disabled) {
          prevBtn.click();
        }
      } else {
        // Swipe left - next question
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
        }
      }
    }
  }

  // Add swipe gesture listeners
  document.addEventListener('touchstart', function(event) {
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
  });

  document.addEventListener('touchend', function(event) {
    touchEndX = event.changedTouches[0].screenX;
    touchEndY = event.changedTouches[0].screenY;
    handleSwipe();
  });

  // Prevent context menu on long press for better UX
  document.addEventListener('contextmenu', function(event) {
    if (event.target.classList.contains('answer') || 
        event.target.classList.contains('btn') ||
        event.target.closest('.answer') ||
        event.target.closest('.btn')) {
      event.preventDefault();
    }
  });

  // Optimize scrolling performance
  let ticking = false;
  function updateScrollPerformance() {
    if (!ticking) {
      requestAnimationFrame(function() {
        // Smooth scrolling optimizations
        document.body.style.willChange = 'scroll-position';
        ticking = false;
      });
      ticking = true;
    }
  }

  document.addEventListener('scroll', updateScrollPerformance, { passive: true });

  // Initialize touch enhancements when DOM is ready
  function initializeMobileEnhancements() {
    // Add touch feedback to buttons
    addTouchFeedback('.btn');
    addTouchFeedback('.btn-outline');
    addTouchFeedback('.btn-delete');
    addTouchFeedback('.btn-flag');
    addTouchFeedback('.btn-icon');
    
    // Add touch feedback to answers
    addAnswerTouchFeedback();
    
    // Add touch feedback to topic cards
    addTouchFeedback('.topic-card');
    addTouchFeedback('.topic-item');
    
    // Add touch feedback to form elements
    addTouchFeedback('select');
    addTouchFeedback('input[type="file"]');
    
    // Optimize form inputs for mobile
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      // Prevent zoom on focus for iOS and Android
      if (input.type === 'text' || input.type === 'email' || input.type === 'password' || input.type === 'number') {
        input.addEventListener('focus', function() {
          if (window.innerWidth < 768) {
            this.style.fontSize = '16px';
          }
          
          // Android specific optimizations
          if (isAndroid) {
            // Scroll input into view on Android
            setTimeout(() => {
              this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }
        });
        
        // Android keyboard handling
        if (isAndroid) {
          input.addEventListener('blur', function() {
            // Handle keyboard dismissal
            window.scrollTo(0, 0);
          });
        }
      }
    });
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      const buttons = document.querySelectorAll('.btn, .answer');
      buttons.forEach(button => {
        button.addEventListener('touchstart', function() {
          navigator.vibrate(10); // Very short vibration
        });
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileEnhancements);
  } else {
    initializeMobileEnhancements();
  }

  // Re-initialize when new content is added (for dynamic content)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Re-add touch feedback to new elements
        setTimeout(() => {
          addTouchFeedback('.btn');
          addTouchFeedback('.answer');
          addTouchFeedback('.topic-card');
          addTouchFeedback('.topic-item');
        }, 100);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Add CSS for touch feedback
  const style = document.createElement('style');
  style.textContent = `
    .touch-device .btn:active,
    .touch-device .answer:active,
    .touch-device .topic-card:active {
      transform: scale(0.95);
      transition: transform 0.1s ease;
    }
    
    .touch-active {
      opacity: 0.8;
    }
    
    /* Prevent text selection on touch devices */
    .touch-device .btn,
    .touch-device .answer,
    .touch-device .topic-card,
    .touch-device .topic-item {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    /* Optimize touch targets */
    .touch-device .btn,
    .touch-device .answer,
    .touch-device .topic-card {
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Smooth transitions for touch interactions */
    .touch-device * {
      transition: transform 0.1s ease, opacity 0.1s ease;
    }
    
    /* Android specific styles */
    .android-device .btn:active,
    .android-device .answer:active,
    .android-device .topic-card:active {
      background-color: rgba(128, 0, 32, 0.1);
      transform: scale(0.98);
      transition: all 0.1s ease;
    }
    
    /* Android Chrome optimizations */
    .android-chrome .container {
      -webkit-overflow-scrolling: touch;
      overflow-scrolling: touch;
    }
    
    .android-chrome .btn,
    .android-chrome .answer,
    .android-chrome .topic-card {
      -webkit-tap-highlight-color: transparent;
      -moz-tap-highlight-color: transparent;
      tap-highlight-color: transparent;
    }
    
    /* Android WebView optimizations */
    .android-webview body {
      -webkit-overflow-scrolling: touch;
      overflow-scrolling: touch;
    }
    
    .android-webview input,
    .android-webview select,
    .android-webview textarea {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
    }
  `;
  document.head.appendChild(style);

})();
