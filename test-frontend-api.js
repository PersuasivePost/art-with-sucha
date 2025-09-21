import fetch from 'node-fetch';

async function testFrontendAPI() {
    try {
        console.log('Testing frontend API call...');
        const backendUrl = 'http://localhost:5000';
        console.log('Fetching from:', backendUrl + '/');
        
        const response = await fetch(backendUrl + '/');
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        const data = await response.json();
        console.log('Response has sections:', !!data.sections);
        console.log('Number of sections:', data.sections?.length || 0);
        console.log('First section name:', data.sections?.[0]?.name || 'none');
        
        if (data.sections && data.sections.length > 0) {
            console.log('✅ API is working! Found sections:');
            data.sections.forEach((section, index) => {
                console.log(`  ${index + 1}. ${section.name} - ${section.children?.length || 0} children`);
            });
        } else {
            console.log('❌ No sections found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testFrontendAPI();