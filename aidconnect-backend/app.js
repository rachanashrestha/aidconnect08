const gratitudeRoutes = require('./routes/gratitudeRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gratitude', gratitudeRoutes); 