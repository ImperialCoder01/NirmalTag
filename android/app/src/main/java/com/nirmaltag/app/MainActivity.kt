package com.nirmaltag.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nirmaltag.app.ui.theme.NirmalTagTheme

enum class UserRoleType(val label: String, val portalName: String) {
    HOUSEHOLD("Household Resident", "Household Portal"),
    COLLECTOR("Field Waste Collector", "Collector Mobile App"),
    TAG_OFFICER("Tag Officer", "Inventory Batch Hub"),
    RWA_ADMIN("RWA Administrator", "RWA Colony Dashboard"),
    BWG_ADMIN("BWG Administrator", "Commercial BWG Hub"),
    MCD_OFFICER("MCD Municipal Officer", "MCD Executive Command"),
    SYSTEM_ADMIN("System Administrator", "Security & RBAC Control")
}

enum class MobileAppScreen {
    APP_INTRO,
    ROLE_AUTH,
    PORTAL_DASHBOARD
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NirmalTagTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NirmalTagAppMasterFlow()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NirmalTagAppMasterFlow() {
    var currentScreen by remember { mutableStateOf(MobileAppScreen.APP_INTRO) }
    var selectedRole by remember { mutableStateOf(UserRoleType.HOUSEHOLD) }
    var userEmail by remember { mutableStateOf("user@nirmaltag.org") }
    var isLoggedIn by remember { mutableStateOf(false) }

    when (currentScreen) {
        MobileAppScreen.APP_INTRO -> {
            AppIntroScreen(
                onNextClicked = {
                    currentScreen = MobileAppScreen.ROLE_AUTH
                }
            )
        }
        MobileAppScreen.ROLE_AUTH -> {
            UserTypeAuthScreen(
                selectedRole = selectedRole,
                onRoleSelected = { selectedRole = it },
                userEmail = userEmail,
                onEmailChange = { userEmail = it },
                onAuthSuccess = {
                    isLoggedIn = true
                    currentScreen = MobileAppScreen.PORTAL_DASHBOARD
                },
                onBackToIntro = {
                    currentScreen = MobileAppScreen.APP_INTRO
                }
            )
        }
        MobileAppScreen.PORTAL_DASHBOARD -> {
            RoleDashboardScreen(
                role = selectedRole,
                userEmail = userEmail,
                onSignOut = {
                    isLoggedIn = false
                    currentScreen = MobileAppScreen.ROLE_AUTH
                }
            )
        }
    }
}

// -------------------------------------------------------------------------
// SCREEN 1: APP INTRO & INFORMATION SCREEN
// -------------------------------------------------------------------------
@Composable
fun AppIntroScreen(onNextClicked: () -> Unit) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(20.dp)
            .verticalScroll(scrollState),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(top = 24.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(90.dp)
                    .clip(CircleShape)
                    .border(3.dp, Color(0xFF0D5C3A), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.logo),
                    contentDescription = "NirmalTag Logo",
                    modifier = Modifier.size(80.dp)
                )
            }

            Text(
                text = "NirmalTag Civic Tech",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )

            Text(
                text = "\"AI-Verified Sanitary & Special-Care Waste Segregation with Doorstep Circular Credits\"",
                fontSize = 13.sp,
                color = Color(0xFF0D5C3A),
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Intro Info Cards
            IntroInfoCard(
                title = "Tamper-Evident QR Pouch Tracking",
                description = "Single-use serial tags with server-side CLOSED state invariants preventing tag reuse.",
                icon = Icons.Default.CheckCircle
            )

            IntroInfoCard(
                title = "On-Device MobileNetV3 AI Vision",
                description = "Runs 100% locally on device hardware for offline field collector evidence verification.",
                icon = Icons.Default.CheckCircle
            )

            IntroInfoCard(
                title = "Doorstep Circular Credit Rewards",
                description = "Household eco-incentives and collector handling wallet (+₹2.00 per verified pickup).",
                icon = Icons.Default.Star
            )

            IntroInfoCard(
                title = "DPDP Act 2023 Compliant",
                description = "Multi-tier Role-Based Access Control (RBAC) and privacy-first data fiduciary protection.",
                icon = Icons.Default.Lock
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onNextClicked,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
            shape = RoundedCornerShape(14.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Get Started / Select User Type",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color.White
                )
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = "Next",
                    tint = Color.White
                )
            }
        }
    }
}

@Composable
fun IntroInfoCard(title: String, description: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFDCFCE7)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Color(0xFF0D5C3A),
                    modifier = Modifier.size(24.dp)
                )
            }
            Column {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A)
                )
                Text(
                    text = description,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    lineHeight = 15.sp
                )
            }
        }
    }
}

// -------------------------------------------------------------------------
// SCREEN 2: USER TYPE SELECTION & AUTHENTICATION SCREEN
// -------------------------------------------------------------------------
@Composable
fun UserTypeAuthScreen(
    selectedRole: UserRoleType,
    onRoleSelected: (UserRoleType) -> Unit,
    userEmail: String,
    onEmailChange: (String) -> Unit,
    onAuthSuccess: () -> Unit,
    onBackToIntro: () -> Unit
) {
    var password by remember { mutableStateOf("••••••••") }
    var hasConsent by remember { mutableStateOf(true) }
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            IconButton(onClick = onBackToIntro) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color(0xFF0F172A))
            }
            Text(
                text = "Sign In & Role Scope",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF0F172A)
            )
        }

        // Step 1: Role Selection
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "STEP 1: SELECT YOUR USER TYPE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF0D5C3A)
                )

                UserRoleType.values().forEach { roleOption ->
                    val isSelected = selectedRole == roleOption
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) Color(0xFFDCFCE7) else Color(0xFFF1F5F9))
                            .clickable { onRoleSelected(roleOption) }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = roleOption.label,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = if (isSelected) Color(0xFF0D5C3A) else Color(0xFF334155)
                            )
                            Text(
                                text = roleOption.portalName,
                                fontSize = 10.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                        RadioButton(
                            selected = isSelected,
                            onClick = { onRoleSelected(roleOption) }
                        )
                    }
                }
            }
        }

        // Step 2: Account Credentials
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "STEP 2: AUTHENTICATE AS ${selectedRole.name}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF0D5C3A)
                )

                OutlinedTextField(
                    value = userEmail,
                    onValueChange = onEmailChange,
                    label = { Text("Email Address") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Checkbox(
                        checked = hasConsent,
                        onCheckedChange = { hasConsent = it }
                    )
                    Text(
                        text = "Agree to DPDP Act 2023 Privacy Policy & Terms",
                        fontSize = 11.sp,
                        color = Color(0xFF475569)
                    )
                }

                Button(
                    onClick = {
                        if (!hasConsent) {
                            Toast.makeText(context, "Please agree to DPDP Privacy Policy.", Toast.LENGTH_SHORT).show()
                        } else {
                            onAuthSuccess()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0D5C3A)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        text = "Sign In as ${selectedRole.label}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color.White
                    )
                }
            }
        }
    }
}

// -------------------------------------------------------------------------
// SCREEN 3: ROLE DASHBOARD SCREEN (ACTION HUB)
// -------------------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleDashboardScreen(
    role: UserRoleType,
    userEmail: String,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    var simulatedState by remember { mutableStateOf("IDLE") }
    var actionMessage by remember { mutableStateOf<String?>(null) }
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.logo),
                            contentDescription = "Logo",
                            modifier = Modifier.size(36.dp)
                        )
                        Column {
                            Text(
                                text = role.label,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = userEmail,
                                fontSize = 10.sp,
                                color = Color(0xFF0D5C3A)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onSignOut) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Sign Out", tint = Color(0xFFDC2626))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Role Welcome Banner
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0D5C3A)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Active Scope: ${role.portalName}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color.White
                    )
                    Text(
                        text = "Authenticated user: $userEmail • MCD Ward 42 Scope",
                        fontSize = 11.sp,
                        color = Color(0xFFDCFCE7)
                    )
                }
            }

            actionMessage?.let { msg ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFDCFCE7))
                ) {
                    Text(
                        text = msg,
                        modifier = Modifier.padding(12.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF166534)
                    )
                }
            }

            // ROLE-SPECIFIC ACTION MODULES
            when (role) {
                UserRoleType.HOUSEHOLD -> {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Household Pouch Actions", fontWeight = FontWeight.Bold)
                            Text("Credit Balance: 140 Points", fontWeight = FontWeight.ExtraBold, color = Color(0xFF0D5C3A))

                            Button(onClick = {
                                actionMessage = "Registered new Pouch Tag NMT-2026-89A4B-000495 (ACTIVE)"
                            }) {
                                Text("Register Pouch Tag")
                            }
                            Button(onClick = {
                                actionMessage = "Doorstep collection scheduled for tomorrow 08:00 AM"
                            }) {
                                Text("Book Doorstep Pickup")
                            }
                            Button(onClick = {
                                actionMessage = "Redeemed ₹50 Electricity Bill Discount (50 Pts deducted)"
                            }) {
                                Text("Redeem Rewards Catalog")
                            }
                        }
                    }
                }
                UserRoleType.COLLECTOR -> {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Field Collector Mobile Scanner", fontWeight = FontWeight.Bold)
                            Text("Incentive Wallet: ₹48.00 (24 Verified)", fontWeight = FontWeight.ExtraBold, color = Color(0xFF0D5C3A))

                            Button(onClick = {
                                actionMessage = "Scanned Tag NMT-2026-89A4B-000492 • AI Confidence: 96% (VERIFIED) • Status set to CLOSED (+₹2.00)"
                            }) {
                                Text("Simulate Camera QR Scan")
                            }
                            Button(onClick = {
                                actionMessage = "Synced 3 queued offline pickups to database. Wallet updated to ₹54.00"
                            }) {
                                Text("Sync Offline Queue (3 Pending)")
                            }
                            Button(onClick = {
                                actionMessage = "Payout request for ₹48.00 submitted to UPI ID collector@upi"
                            }) {
                                Text("Request Wallet Payout")
                            }
                        }
                    }
                }
                UserRoleType.TAG_OFFICER -> {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Tag Officer Inventory Hub", fontWeight = FontWeight.Bold)
                            Button(onClick = {
                                actionMessage = "Created Batch BATCH-2026-004 with 1,000 Sanitary Tags for Ward 42"
                            }) {
                                Text("Generate Authorized Batch (1,000 Tags)")
                            }
                            Button(onClick = {
                                actionMessage = "Tag NMT-2026-89A4B-000490 checked. Status: CLOSED (Single-Use Invariant Locked)"
                            }) {
                                Text("Lookup Tag Code NMT-2026-89A4B-000490")
                            }
                        }
                    }
                }
                UserRoleType.RWA_ADMIN -> {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("RWA Colony Compliance", fontWeight = FontWeight.Bold)
                            Text("450 Registered Households • 96.8% Compliance", fontSize = 12.sp)
                            Button(onClick = {
                                actionMessage = "Registered new resident Kapoor Family (Block B, Flat 501)"
                            }) {
                                Text("Register Colony Household")
                            }
                            Button(onClick = {
                                actionMessage = "Submitted uncollected pouch incident report to MCD Command"
                            }) {
                                Text("Report Incident to MCD")
                            }
                        }
                    }
                }
                UserRoleType.BWG_ADMIN -> {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Commercial Bulk Waste Hub", fontWeight = FontWeight.Bold)
                            Text("Daily Volume: 120 kg • Grade A Compliance", fontSize = 12.sp)
                            Button(onClick = {
                                actionMessage = "Logged 120kg Commercial Diaper Waste. Container Seal: SEAL-9022-X"
                            }) {
                                Text("Log Daily Waste Volume")
                            }
                            Button(onClick = {
                                actionMessage = "Downloaded official MCD BWG Compliance Certificate HTML"
                            }) {
                                Text("Download MCD Compliance Cert")
                            }
                        }
                    }
                }
                UserRoleType.MCD_OFFICER -> {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("MCD Executive Telemetry Command", fontWeight = FontWeight.Bold)
                            Text("Ward 42 Pickups: 5,800 Verified (96% Rate)", fontSize = 12.sp)
                            Button(onClick = {
                                actionMessage = "Dispute DSP-101 Approved. Pickup verified & credit points awarded."
                            }) {
                                Text("Resolve Pending AI Dispute DSP-101")
                            }
                            Button(onClick = {
                                actionMessage = "Sanitary waste segregation advisory broadcasted to all Ward 42 RWAs."
                            }) {
                                Text("Broadcast Ward Advisory Notice")
                            }
                        }
                    }
                }
                UserRoleType.SYSTEM_ADMIN -> {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("System RBAC & Policy Engine", fontWeight = FontWeight.Bold)
                            Button(onClick = {
                                actionMessage = "Granted COLLECTOR role to user inspector.rajesh@nirmaltag.org"
                            }) {
                                Text("Provision User Role Assignment")
                            }
                            Button(onClick = {
                                actionMessage = "Exported System Security Audit Trail (4 Events)"
                            }) {
                                Text("Export Security Audit Trail CSV")
                            }
                        }
                    }
                }
            }
        }
    }
}
