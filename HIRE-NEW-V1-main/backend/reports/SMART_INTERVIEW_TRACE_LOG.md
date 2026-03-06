
## 2026-03-03T11:32:27.017Z | cli-smart-interview-test | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart_interview_sample.mp3",
  "audioBytes": 45024,
  "audioModelChain": [
    "gemini-2.0-flash",
    "gemini-2.5-flash"
  ],
  "textModelChain": [
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-flash"
  ]
}
```

## 2026-03-03T11:32:27.051Z | cli-smart-interview-test | pipeline_error
```json
{
  "message": "getaddrinfo ENOTFOUND generativelanguage.googleapis.com",
  "statusCode": 422,
  "role": "worker"
}
```

## TRACE SUMMARY (2026-03-03)
- Run type: CLI extraction smoke test with generated sample speech audio (`/tmp/smart_interview_sample.mp3`).
- Pipeline reached: audio read + pipeline start logging.
- Blocker: DNS/network resolution failure to `generativelanguage.googleapis.com` (`ENOTFOUND`).
- Result: STT and Gemini extraction did not complete in this environment.
- Action needed to complete full end-to-end trace: run backend with outbound DNS/network access and run one Smart Interview from mobile app.

## 2026-03-03T11:41:13.543Z | smoke-test | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart_interview_sample.mp3",
  "audioBytes": 45024,
  "audioModelChain": [
    "gemini-2.0-flash",
    "gemini-2.5-flash"
  ],
  "textModelChain": [
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-flash"
  ]
}
```

## 2026-03-03T11:41:13.548Z | smoke-test | pipeline_error
```json
{
  "message": "GEMINI_API_KEY_NOT_CONFIGURED",
  "statusCode": 422,
  "role": "worker"
}
```

## 2026-03-03T11:41:20.228Z | smoke-test | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart_interview_sample.mp3",
  "audioBytes": 45024,
  "audioModelChain": [
    "gemini-3-flash-preview",
    "gemini-2.0-flash"
  ],
  "textModelChain": [
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-flash"
  ]
}
```

## 2026-03-03T11:41:20.255Z | smoke-test | pipeline_error
```json
{
  "message": "getaddrinfo ENOTFOUND generativelanguage.googleapis.com",
  "statusCode": 422,
  "role": "worker"
}
```

## 2026-03-03T11:41:30.850Z | smoke-test | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart_interview_sample.mp3",
  "audioBytes": 45024,
  "audioModelChain": [
    "gemini-3-flash-preview",
    "gemini-2.0-flash"
  ],
  "textModelChain": [
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-flash"
  ]
}
```

## 2026-03-03T11:41:46.333Z | smoke-test | pipeline_error
```json
{
  "message": "Request failed with status code 429",
  "statusCode": 422,
  "role": "worker"
}
```

## 2026-03-03T11:53:45.309Z | diag-run | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart_interview_sample.mp3",
  "audioBytes": 45024,
  "audioModelChain": [
    "gemini-3-flash-preview",
    "gemini-2.0-flash"
  ],
  "textModelChain": [
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-flash"
  ]
}
```

## 2026-03-03T11:54:01.522Z | diag-run | pipeline_error
```json
{
  "message": "Request failed with status code 404",
  "statusCode": 422,
  "role": "worker"
}
```

## 2026-03-03T11:54:20.620Z | diag-run-2 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart_interview_sample.mp3",
  "audioBytes": 45024,
  "audioModelChain": [
    "gemini-2.5-flash"
  ],
  "textModelChain": [
    "gemini-2.5-flash"
  ]
}
```

## 2026-03-03T11:54:22.696Z | diag-run-2 | stt_transcription_return
```json
{
  "transcript": "I am a three-year React developer in Bangalore expecting 12 lakh salary and looking for front-end role with React and JavaScript skills.",
  "transcriptLength": 136,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T11:54:23.858Z | diag-run-2 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"\", \"city\": \"Bangalore\", \"totalExperience\": 3, \"roleName\": \"Frontend Developer\", \"expectedSalary\": 1200000, \"skills\": [\"React\", \"JavaScript\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T11:54:23.858Z | diag-run-2 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "",
    "city": "Bangalore",
    "totalExperience": 3,
    "roleName": "Frontend Developer",
    "expectedSalary": 1200000,
    "skills": [
      "React",
      "JavaScript"
    ]
  }
}
```

## 2026-03-03T11:54:23.859Z | diag-run-2 | validation_layer
```json
{
  "coverageScore": 5,
  "missingFields": [
    "firstName"
  ],
  "sanitizedExtraction": {
    "firstName": "",
    "city": "Bangalore",
    "totalExperience": 3,
    "roleName": "Frontend Developer",
    "expectedSalary": 1200000,
    "skills": [
      "React",
      "JavaScript"
    ]
  }
}
```

## 2026-03-03T11:57:45.973Z | diag-run-3 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart_interview_sample.mp3",
  "audioBytes": 45024,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T11:57:48.893Z | diag-run-3 | stt_transcription_return
```json
{
  "transcript": "I am a three-year React developer in Bangalore expecting 12 lakh salary and looking for front-end role with React and JavaScript skills.",
  "transcriptLength": 136,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T11:57:50.153Z | diag-run-3 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"\", \"city\": \"Bangalore\", \"totalExperience\": 3, \"roleName\": \"Frontend Developer\", \"expectedSalary\": 1200000, \"skills\": [\"React\", \"JavaScript\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T11:57:50.154Z | diag-run-3 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "",
    "city": "Bangalore",
    "totalExperience": 3,
    "roleName": "Frontend Developer",
    "expectedSalary": 1200000,
    "skills": [
      "React",
      "JavaScript"
    ]
  }
}
```

## 2026-03-03T11:57:50.154Z | diag-run-3 | validation_layer
```json
{
  "coverageScore": 5,
  "missingFields": [
    "firstName"
  ],
  "sanitizedExtraction": {
    "firstName": "",
    "city": "Bangalore",
    "totalExperience": 3,
    "roleName": "Frontend Developer",
    "expectedSalary": 1200000,
    "skills": [
      "React",
      "JavaScript"
    ]
  }
}
```

## 2026-03-03T11:58:20.755Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | request_received
```json
{
  "originalName": "smart_interview_sample.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 9610,
  "userId": "69a6ccdc30ceb6ba6552bfe4"
}
```

## 2026-03-03T11:58:20.756Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | video_uploaded
```json
{
  "videoUrl": "debug://local/video.mp4"
}
```

## 2026-03-03T11:58:20.909Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | audio_conversion
```json
{
  "audioPath": "uploads/debug-1772539100751.mp3",
  "mimeType": "audio/mpeg",
  "sizeBytes": 747
}
```

## 2026-03-03T11:58:20.910Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "uploads/debug-1772539100751.mp3",
  "audioBytes": 996,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T11:58:27.767Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | stt_transcription_return
```json
{
  "transcript": "Hello. Hello. How are you? I'm good. How are you? I'm good. So, I'm just going to ask you a few questions. Okay. So, what is your name? My name is Kiana. And what is your occupation? I am a student. And what is your major? My major is psychology. And what is your classification? I am a junior. And what is your hometown? My hometown is Houston, Texas. And what is your favorite color? My favorite color is pink. And what is your favorite food? My favorite food is pasta. And what is your favorite movie? My favorite movie is The Princess and the Frog. And what is your favorite song? My favorite song is I'm the One by DJ Khaled. And what is your favorite animal? My favorite animal is a dog. And what is your favorite season? My favorite season is summer. And what is your favorite holiday? My favorite holiday is Christmas. And what is your favorite sport? My favorite sport is basketball. And what is your favorite book? My favorite book is The Hate U Give. And what is your favorite subject? My favorite subject is psychology. And what is your favorite hobby? My favorite hobby is reading. And what is your favorite place to visit? My favorite place to visit is the beach. And what is your favorite thing to do in your free time? My favorite thing to do in my free time is watch TV. And what is your favorite quote? My favorite quote is, \"Be the change you wish to see in the world.\" And what is your favorite memory? My favorite memory is graduating high school. And what is your favorite thing about yourself? My favorite thing about myself is my personality. And what is your biggest fear? My biggest fear is failure. And what is your biggest accomplishment? My biggest accomplishment is getting into college. And what is your biggest dream? My biggest dream is to become a successful psychologist. And what is your biggest goal for the future? My biggest goal for the future is to graduate college and get a good job. And what is your biggest pet peeve? My biggest pet peeve is when people chew with their mouth open. And what is your biggest strength? My biggest strength is my determination. And what is your biggest weakness? My biggest weakness is procrastination. And what is your biggest regret? My biggest regret is not studying harder in high school. And what is your biggest lesson learned? My biggest lesson learned is to always be yourself. And what is your biggest advice for others? My biggest advice for others is to never give up on your dreams. And what is your biggest hope for the world? My biggest hope for the world is for everyone to be treated equally. And what is your biggest wish? My biggest wish is for world peace. And what is your biggest thank you? My biggest thank you is to my parents for always supporting me. And what is your biggest love? My biggest love is my family. And what is your biggest passion? My biggest passion is helping others. And what is your biggest inspiration? My biggest inspiration is my mom. And what is your biggest hero? My biggest hero is my dad. And what is your biggest role model? My biggest role model is Oprah Winfrey. And what is your biggest dream vacation? My biggest dream vacation is to go to Bora Bora. And what is your biggest dream car? My biggest dream car is a Tesla. And what is your biggest dream house? My biggest dream house is a mansion with a pool. And what is your biggest dream job? My biggest dream job is to be a forensic psychologist. And what is your biggest dream pet? My biggest dream pet is a golden retriever. And what is your biggest dream superpower? My biggest dream superpower is to be able to fly. And what is your biggest dream meal? My biggest dream meal is a five-course meal with all my favorite foods. And what is your biggest dream gift? My biggest dream gift is a trip around the world. And what is your biggest dream date? My biggest dream date is a romantic dinner on the beach. And what is your biggest dream concert? My biggest dream concert is to see Beyoncé live.
...[truncated]
```

## 2026-03-03T11:58:29.010Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"Kiana\", \"city\": \"Houston\", \"totalExperience\": 0, \"roleName\": \"Forensic Psychologist\", \"expectedSalary\": 0, \"skills\": [\"Psychology\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T11:58:29.011Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "Kiana",
    "city": "Houston",
    "totalExperience": 0,
    "roleName": "Forensic Psychologist",
    "expectedSalary": 0,
    "skills": [
      "Psychology"
    ]
  }
}
```

## 2026-03-03T11:58:29.011Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | validation_layer
```json
{
  "coverageScore": 4,
  "missingFields": [
    "totalExperience",
    "expectedSalary"
  ],
  "sanitizedExtraction": {
    "firstName": "Kiana",
    "city": "Houston",
    "totalExperience": 0,
    "roleName": "Forensic Psychologist",
    "expectedSalary": 0,
    "skills": [
      "Psychology"
    ]
  }
}
```

## 2026-03-03T11:58:29.012Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | gemini_structured_output
```json
{
  "rawTranscript": "Hello. Hello. How are you? I'm good. How are you? I'm good. So, I'm just going to ask you a few questions. Okay. So, what is your name? My name is Kiana. And what is your occupation? I am a student. And what is your major? My major is psychology. And what is your classification? I am a junior. And what is your hometown? My hometown is Houston, Texas. And what is your favorite color? My favorite color is pink. And what is your favorite food? My favorite food is pasta. And what is your favorite movie? My favorite movie is The Princess and the Frog. And what is your favorite song? My favorite song is I'm the One by DJ Khaled. And what is your favorite animal? My favorite animal is a dog. And what is your favorite season? My favorite season is summer. And what is your favorite holiday? My favorite holiday is Christmas. And what is your favorite sport? My favorite sport is basketball. And what is your favorite book? My favorite book is The Hate U Give. And what is your favorite subject? My favorite subject is psychology. And what is your favorite hobby? My favorite hobby is reading. And what is your favorite place to visit? My favorite place to visit is the beach. And what is your favorite thing to do in your free time? My favorite thing to do in my free time is watch TV. And what is your favorite quote? My favorite quote is, \"Be the change you wish to see in the world.\" And what is your favorite memory? My favorite memory is graduating high school. And what is your favorite thing about yourself? My favorite thing about myself is my personality. And what is your biggest fear? My biggest fear is failure. And what is your biggest accomplishment? My biggest accomplishment is getting into college. And what is your biggest dream? My biggest dream is to become a successful psychologist. And what is your biggest goal for the future? My biggest goal for the future is to graduate college and get a good job. And what is your biggest pet peeve? My biggest pet peeve is when people chew with their mouth open. And what is your biggest strength? My biggest strength is my determination. And what is your biggest weakness? My biggest weakness is procrastination. And what is your biggest regret? My biggest regret is not studying harder in high school. And what is your biggest lesson learned? My biggest lesson learned is to always be yourself. And what is your biggest advice for others? My biggest advice for others is to never give up on your dreams. And what is your biggest hope for the world? My biggest hope for the world is for everyone to be treated equally. And what is your biggest wish? My biggest wish is for world peace. And what is your biggest thank you? My biggest thank you is to my parents for always supporting me. And what is your biggest love? My biggest love is my family. And what is your biggest passion? My biggest passion is helping others. And what is your biggest inspiration? My biggest inspiration is my mom. And what is your biggest hero? My biggest hero is my dad. And what is your biggest role model? My biggest role model is Oprah Winfrey. And what is your biggest dream vacation? My biggest dream vacation is to go to Bora Bora. And what is your biggest dream car? My biggest dream car is a Tesla. And what is your biggest dream house? My biggest dream house is a mansion with a pool. And what is your biggest dream job? My biggest dream job is to be a forensic psychologist. And what is your biggest dream pet? My biggest dream pet is a golden retriever. And what is your biggest dream superpower? My biggest dream superpower is to be able to fly. And what is your biggest dream meal? My biggest dream meal is a five-course meal with all my favorite foods. And what is your biggest dream gift? My biggest dream gift is a trip around the world. And what is your biggest dream date? My biggest dream date is a romantic dinner on the beach. And what is your biggest dream concert? My biggest dream concert is to see Beyoncé li
...[truncated]
```

## 2026-03-03T11:58:29.013Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | validation_layer
```json
{
  "normalizedExtraction": {
    "roleName": "Forensic Psychologist",
    "city": "Houston",
    "skills": [
      "Psychology"
    ],
    "totalExperience": 0,
    "expectedSalary": 0
  },
  "validationIssues": [
    {
      "field": "totalExperience",
      "reason": "must_be_positive_number"
    },
    {
      "field": "expectedSalary",
      "reason": "must_be_positive_number"
    }
  ]
}
```

## 2026-03-03T11:58:29.013Z | v1-69a6ccdc30ceb6ba6552bfe4-1772539100753 | pipeline_error
```json
{
  "message": "Smart Interview extraction is incomplete. Please clearly mention role, city, experience, expected salary, and skills.",
  "statusCode": 422,
  "details": {
    "success": false,
    "error": "Smart Interview extraction is incomplete. Please clearly mention role, city, experience, expected salary, and skills.",
    "validationIssues": [
      {
        "field": "totalExperience",
        "reason": "must_be_positive_number"
      },
      {
        "field": "expectedSalary",
        "reason": "must_be_positive_number"
      }
    ],
    "extractedData": {
      "roleName": "Forensic Psychologist",
      "city": "Houston",
      "skills": [
        "Psychology"
      ],
      "totalExperience": 0,
      "expectedSalary": 0
    }
  }
}
```

## 2026-03-03T11:58:58.520Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | request_received
```json
{
  "originalName": "smart_interview_sample.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 9610,
  "userId": "69a6cd02f51d0443165e96b0"
}
```

## 2026-03-03T11:58:58.529Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | video_uploaded
```json
{
  "videoUrl": "debug://local/video.mp4"
}
```

## 2026-03-03T11:58:58.767Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | audio_conversion
```json
{
  "audioPath": "uploads/debug-1772539138512.mp3",
  "mimeType": "audio/mpeg",
  "sizeBytes": 747
}
```

## 2026-03-03T11:58:58.768Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "uploads/debug-1772539138512.mp3",
  "audioBytes": 996,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T11:59:04.510Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | stt_transcription_return
```json
{
  "transcript": "Hello, and welcome to the show. Today, we're joined by Dr. Sarah Miller, a renowned expert in environmental science. Dr. Miller, thank you for being here. Thank you for having me. It's a pleasure to be here. Dr. Miller, your recent research on climate change has garnered significant attention. Could you briefly explain the key findings of your study? Certainly. Our study focused on the accelerated melting of glaciers in the Arctic region. We found that the rate of melting has increased by 30% over the past decade, primarily due to rising global temperatures. This has significant implications for sea-level rise and the delicate Arctic ecosystem. That's a concerning finding. What do you believe are the most immediate consequences of this accelerated melting? The most immediate consequence is the contribution to global sea-level rise, which threatens coastal communities worldwide. Additionally, the loss of glacial ice impacts local ecosystems, affecting wildlife like polar bears and seals that rely on the ice for hunting and breeding. Beyond the immediate, what are the long-term implications if this trend continues? In the long term, we're looking at more extreme weather events, disruptions to ocean currents, and potential feedback loops that could further accelerate warming. It's a complex system, and changes in one area can have cascading effects globally. Your research also touched upon potential solutions. What are some of the most promising strategies to mitigate these effects? Our research highlights the critical need for immediate and drastic reductions in greenhouse gas emissions. Transitioning to renewable energy sources, improving energy efficiency, and implementing sustainable land-use practices are paramount. We also emphasize the importance of international cooperation and policy changes. Are there any specific technologies or innovations that you believe hold particular promise in this fight against climate change? Absolutely. Advancements in carbon capture and storage technologies, as well as innovations in sustainable agriculture and reforestation, show great promise. Furthermore, developing more efficient and affordable renewable energy technologies is crucial. What role do you see individuals playing in addressing this global challenge? Individual actions, while seemingly small, collectively make a significant impact. Reducing personal carbon footprints through conscious consumption, supporting sustainable businesses, and advocating for policy changes are all vital. Education and awareness are also key. Dr. Miller, your work is truly inspiring. For those who want to learn more about your research or get involved, where can they find more information? They can visit our research group's website at [website address] or follow our updates on social media. We also publish our findings in peer-reviewed journals, which are accessible through academic databases. Thank you again, Dr. Miller, for sharing your invaluable insights with us today. It was my pleasure. Thank you for having me. And that concludes our show for today. Join us next time for another insightful discussion.",
  "transcriptLength": 3140,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T11:59:05.628Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"\", \"city\": \"\", \"totalExperience\": 0, \"roleName\": \"\", \"expectedSalary\": 0, \"skills\": []}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T11:59:05.630Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "",
    "city": "",
    "totalExperience": 0,
    "roleName": "",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T11:59:05.631Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | validation_layer
```json
{
  "coverageScore": 0,
  "missingFields": [
    "firstName",
    "city",
    "roleName",
    "totalExperience",
    "expectedSalary",
    "skills"
  ],
  "sanitizedExtraction": {
    "firstName": "",
    "city": "",
    "totalExperience": 0,
    "roleName": "",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T11:59:05.632Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | gemini_structured_output
```json
{
  "rawTranscript": "Hello, and welcome to the show. Today, we're joined by Dr. Sarah Miller, a renowned expert in environmental science. Dr. Miller, thank you for being here. Thank you for having me. It's a pleasure to be here. Dr. Miller, your recent research on climate change has garnered significant attention. Could you briefly explain the key findings of your study? Certainly. Our study focused on the accelerated melting of glaciers in the Arctic region. We found that the rate of melting has increased by 30% over the past decade, primarily due to rising global temperatures. This has significant implications for sea-level rise and the delicate Arctic ecosystem. That's a concerning finding. What do you believe are the most immediate consequences of this accelerated melting? The most immediate consequence is the contribution to global sea-level rise, which threatens coastal communities worldwide. Additionally, the loss of glacial ice impacts local ecosystems, affecting wildlife like polar bears and seals that rely on the ice for hunting and breeding. Beyond the immediate, what are the long-term implications if this trend continues? In the long term, we're looking at more extreme weather events, disruptions to ocean currents, and potential feedback loops that could further accelerate warming. It's a complex system, and changes in one area can have cascading effects globally. Your research also touched upon potential solutions. What are some of the most promising strategies to mitigate these effects? Our research highlights the critical need for immediate and drastic reductions in greenhouse gas emissions. Transitioning to renewable energy sources, improving energy efficiency, and implementing sustainable land-use practices are paramount. We also emphasize the importance of international cooperation and policy changes. Are there any specific technologies or innovations that you believe hold particular promise in this fight against climate change? Absolutely. Advancements in carbon capture and storage technologies, as well as innovations in sustainable agriculture and reforestation, show great promise. Furthermore, developing more efficient and affordable renewable energy technologies is crucial. What role do you see individuals playing in addressing this global challenge? Individual actions, while seemingly small, collectively make a significant impact. Reducing personal carbon footprints through conscious consumption, supporting sustainable businesses, and advocating for policy changes are all vital. Education and awareness are also key. Dr. Miller, your work is truly inspiring. For those who want to learn more about your research or get involved, where can they find more information? They can visit our research group's website at [website address] or follow our updates on social media. We also publish our findings in peer-reviewed journals, which are accessible through academic databases. Thank you again, Dr. Miller, for sharing your invaluable insights with us today. It was my pleasure. Thank you for having me. And that concludes our show for today. Join us next time for another insightful discussion.",
  "parsedStructuredObject": {
    "firstName": "",
    "city": "",
    "totalExperience": 0,
    "roleName": "",
    "expectedSalary": 0,
    "skills": [],
    "transcript": "Hello, and welcome to the show. Today, we're joined by Dr. Sarah Miller, a renowned expert in environmental science. Dr. Miller, thank you for being here. Thank you for having me. It's a pleasure to be here. Dr. Miller, your recent research on climate change has garnered significant attention. Could you briefly explain the key findings of your study? Certainly. Our study focused on the accelerated melting of glaciers in the Arctic region. We found that the rate of melting has increased by 30% over the past decade, primarily due to rising global temperatures. This has significant implications for sea-level rise and the delicate Arctic ecosystem. That's 
...[truncated]
```

## 2026-03-03T11:59:05.633Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | validation_layer
```json
{
  "normalizedExtraction": {
    "roleName": "",
    "city": "",
    "skills": [],
    "totalExperience": 0,
    "expectedSalary": 0
  },
  "validationIssues": [
    {
      "field": "roleName",
      "reason": "missing_or_empty"
    },
    {
      "field": "city",
      "reason": "missing_or_empty"
    },
    {
      "field": "skills",
      "reason": "missing_or_empty"
    },
    {
      "field": "totalExperience",
      "reason": "must_be_positive_number"
    },
    {
      "field": "expectedSalary",
      "reason": "must_be_positive_number"
    }
  ]
}
```

## 2026-03-03T11:59:05.633Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | profile_builder
```json
{
  "role": "worker",
  "extractedData": {
    "name": "Debug User",
    "roleTitle": "",
    "skills": [],
    "experienceYears": 0,
    "expectedSalary": "",
    "preferredShift": "flexible",
    "location": "",
    "summary": ""
  }
}
```

## 2026-03-03T11:59:05.658Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | db_write
```json
{
  "profileId": "69a6cd09a053c8bdd27366fc",
  "jobId": "",
  "finalSavedProfileDocument": {
    "_id": "69a6cd09a053c8bdd27366fc",
    "firstName": "Debug",
    "roleProfiles": [
      {
        "roleName": "",
        "experienceInRole": 0,
        "expectedSalary": 0,
        "skills": [],
        "lastUpdated": "2026-03-03T11:59:05.633Z",
        "_id": "69a6cd09f51d0443165e96b7"
      }
    ]
  }
}
```

## 2026-03-03T11:59:05.658Z | v1-69a6cd02f51d0443165e96b0-1772539138515 | response_sent
```json
{
  "success": true,
  "videoUrl": "debug://local/video.mp4",
  "extractedData": {
    "name": "Debug User",
    "roleTitle": "",
    "skills": [],
    "experienceYears": 0,
    "expectedSalary": "",
    "preferredShift": "flexible",
    "location": "",
    "summary": ""
  },
  "profile": {
    "videoIntroduction": {
      "videoUrl": "debug://local/video.mp4",
      "transcript": "Hello, and welcome to the show. Today, we're joined by Dr. Sarah Miller, a renowned expert in environmental science. Dr. Miller, thank you for being here. Thank you for having me. It's a pleasure to be here. Dr. Miller, your recent research on climate change has garnered significant attention. Could you briefly explain the key findings of your study? Certainly. Our study focused on the accelerated melting of glaciers in the Arctic region. We found that the rate of melting has increased by 30% over the past decade, primarily due to rising global temperatures. This has significant implications for sea-level rise and the delicate Arctic ecosystem. That's a concerning finding. What do you believe are the most immediate consequences of this accelerated melting? The most immediate consequence is the contribution to global sea-level rise, which threatens coastal communities worldwide. Additionally, the loss of glacial ice impacts local ecosystems, affecting wildlife like polar bears and seals that rely on the ice for hunting and breeding. Beyond the immediate, what are the long-term implications if this trend continues? In the long term, we're looking at more extreme weather events, disruptions to ocean currents, and potential feedback loops that could further accelerate warming. It's a complex system, and changes in one area can have cascading effects globally. Your research also touched upon potential solutions. What are some of the most promising strategies to mitigate these effects? Our research highlights the critical need for immediate and drastic reductions in greenhouse gas emissions. Transitioning to renewable energy sources, improving energy efficiency, and implementing sustainable land-use practices are paramount. We also emphasize the importance of international cooperation and policy changes. Are there any specific technologies or innovations that you believe hold particular promise in this fight against climate change? Absolutely. Advancements in carbon capture and storage technologies, as well as innovations in sustainable agriculture and reforestation, show great promise. Furthermore, developing more efficient and affordable renewable energy technologies is crucial. What role do you see individuals playing in addressing this global challenge? Individual actions, while seemingly small, collectively make a significant impact. Reducing personal carbon footprints through conscious consumption, supporting sustainable businesses, and advocating for policy changes are all vital. Education and awareness are also key. Dr. Miller, your work is truly inspiring. For those who want to learn more about your research or get involved, where can they find more information? They can visit our research group's website at [website address] or follow our updates on social media. We also publish our findings in peer-reviewed journals, which are accessible through academic databases. Thank you again, Dr. Miller, for sharing your invaluable insights with us today. It was my pleasure. Thank you for having me. And that concludes our show for today. Join us next time for another insightful discussion.",
      "rawExtraction": {
        "firstName": "",
        "city": "",
        "totalExperience": 0,
        "roleName": "",
        "expectedSalary": 0,
        "skills": [],
        "transcript": "Hello, and welcome to the show. Today, we're joined by Dr. Sarah Miller, a renowned expert in environmental science. Dr. Miller, thank you for being here. Thank you for having me. It's a pleasure to be here. Dr. Miller, your recent research on climate change has garnered si
...[truncated]
```

## 2026-03-03T12:15:00.517Z | phase5-worker-run | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/chennai_test.mp3",
  "audioBytes": 24684,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T12:15:00.530Z | phase5-worker-run | gemini_called
```json
{
  "stage": "transcription",
  "operation": "transcribe_interview_audio",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ]
}
```

## 2026-03-03T12:15:03.253Z | phase5-worker-run | transcript_received
```json
{
  "transcript": "I am a 5-year React developer in Chennai expecting 18 LPA.",
  "transcriptLength": 58,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:15:03.253Z | phase5-worker-run | stt_transcription_return
```json
{
  "transcript": "I am a 5-year React developer in Chennai expecting 18 LPA.",
  "transcriptLength": 58,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:15:03.253Z | phase5-worker-run | gemini_called
```json
{
  "stage": "extraction",
  "operation": "extract_worker_data_from_transcript",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T12:15:04.140Z | phase5-worker-run | gemini_response_received
```json
{
  "operation": "extract_worker_data_from_transcript",
  "rawGeminiResponse": "{\"firstName\": \"\", \"city\": \"Chennai\", \"totalExperience\": 5, \"roleName\": \"React Developer\", \"expectedSalary\": 1800000, \"skills\": [\"React\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:15:04.141Z | phase5-worker-run | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"\", \"city\": \"Chennai\", \"totalExperience\": 5, \"roleName\": \"React Developer\", \"expectedSalary\": 1800000, \"skills\": [\"React\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:15:04.141Z | phase5-worker-run | json_parsed
```json
{
  "parsedStructuredObject": {
    "firstName": "",
    "city": "Chennai",
    "totalExperience": 5,
    "roleName": "React Developer",
    "expectedSalary": 1800000,
    "skills": [
      "React"
    ]
  }
}
```

## 2026-03-03T12:15:04.141Z | phase5-worker-run | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "",
    "city": "Chennai",
    "totalExperience": 5,
    "roleName": "React Developer",
    "expectedSalary": 1800000,
    "skills": [
      "React"
    ]
  }
}
```

## 2026-03-03T12:15:04.142Z | phase5-worker-run | validation_layer
```json
{
  "coverageScore": 5,
  "missingFields": [
    "firstName"
  ],
  "sanitizedExtraction": {
    "firstName": "",
    "city": "Chennai",
    "totalExperience": 5,
    "roleName": "React Developer",
    "expectedSalary": 1800000,
    "skills": [
      "React"
    ]
  }
}
```

## 2026-03-03T12:16:48.972Z | v1-69a6d130b82f377c9d838f22-1772540208971 | pipeline_start
```json
{
  "userId": "69a6d130b82f377c9d838f22",
  "role": "worker",
  "originalName": "chennai_test.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 9660
}
```

## 2026-03-03T12:16:48.972Z | v1-69a6d130b82f377c9d838f22-1772540208971 | request_received
```json
{
  "originalName": "chennai_test.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 9660,
  "userId": "69a6d130b82f377c9d838f22"
}
```

## 2026-03-03T12:16:48.974Z | v1-69a6d130b82f377c9d838f22-1772540208971 | video_uploaded
```json
{
  "videoUrl": "debug://phase5/video.mp4"
}
```

## 2026-03-03T12:16:49.084Z | v1-69a6d130b82f377c9d838f22-1772540208971 | audio_conversion
```json
{
  "audioPath": "uploads/phase5-1772540208969.mp3",
  "mimeType": "audio/mpeg",
  "sizeBytes": 747
}
```

## 2026-03-03T12:16:49.085Z | v1-69a6d130b82f377c9d838f22-1772540208971 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "uploads/phase5-1772540208969.mp3",
  "audioBytes": 996,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T12:16:49.085Z | v1-69a6d130b82f377c9d838f22-1772540208971 | gemini_called
```json
{
  "stage": "transcription",
  "operation": "transcribe_interview_audio",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ]
}
```

## 2026-03-03T12:16:51.434Z | v1-69a6d130b82f377c9d838f22-1772540208971 | transcript_received
```json
{
  "transcript": "So, what's your name?",
  "transcriptLength": 21,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:16:51.434Z | v1-69a6d130b82f377c9d838f22-1772540208971 | stt_transcription_return
```json
{
  "transcript": "So, what's your name?",
  "transcriptLength": 21,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:16:51.434Z | v1-69a6d130b82f377c9d838f22-1772540208971 | gemini_called
```json
{
  "stage": "extraction",
  "operation": "extract_worker_data_from_transcript",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T12:16:52.648Z | v1-69a6d130b82f377c9d838f22-1772540208971 | gemini_response_received
```json
{
  "operation": "extract_worker_data_from_transcript",
  "rawGeminiResponse": "{\"firstName\": \"\", \"city\": \"\", \"totalExperience\": 0, \"roleName\": \"\", \"expectedSalary\": 0, \"skills\": []}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:16:52.649Z | v1-69a6d130b82f377c9d838f22-1772540208971 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"\", \"city\": \"\", \"totalExperience\": 0, \"roleName\": \"\", \"expectedSalary\": 0, \"skills\": []}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T12:16:52.649Z | v1-69a6d130b82f377c9d838f22-1772540208971 | json_parsed
```json
{
  "parsedStructuredObject": {
    "firstName": "",
    "city": "",
    "totalExperience": 0,
    "roleName": "",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T12:16:52.649Z | v1-69a6d130b82f377c9d838f22-1772540208971 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "",
    "city": "",
    "totalExperience": 0,
    "roleName": "",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T12:16:52.650Z | v1-69a6d130b82f377c9d838f22-1772540208971 | validation_layer
```json
{
  "coverageScore": 0,
  "missingFields": [
    "firstName",
    "city",
    "roleName",
    "totalExperience",
    "expectedSalary",
    "skills"
  ],
  "sanitizedExtraction": {
    "firstName": "",
    "city": "",
    "totalExperience": 0,
    "roleName": "",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T12:16:52.650Z | v1-69a6d130b82f377c9d838f22-1772540208971 | transcript_received
```json
{
  "transcript": "So, what's your name?",
  "transcriptLength": 21
}
```

## 2026-03-03T12:16:52.650Z | v1-69a6d130b82f377c9d838f22-1772540208971 | gemini_structured_output
```json
{
  "rawTranscript": "So, what's your name?",
  "parsedStructuredObject": {
    "firstName": "",
    "city": "",
    "totalExperience": 0,
    "roleName": "",
    "expectedSalary": 0,
    "skills": [],
    "transcript": "So, what's your name?",
    "manualFallbackRequired": true,
    "coverageScore": 0,
    "missingFields": [
      "firstName",
      "city",
      "roleName",
      "totalExperience",
      "expectedSalary",
      "skills"
    ]
  }
}
```

## 2026-03-03T12:16:52.650Z | v1-69a6d130b82f377c9d838f22-1772540208971 | validation_layer
```json
{
  "normalizedExtraction": {
    "roleName": "",
    "city": "",
    "skills": [],
    "totalExperience": 0,
    "expectedSalary": 0
  },
  "validationIssues": [
    {
      "field": "roleName",
      "reason": "missing_or_empty"
    },
    {
      "field": "city",
      "reason": "missing_or_empty"
    },
    {
      "field": "skills",
      "reason": "missing_or_empty"
    },
    {
      "field": "totalExperience",
      "reason": "must_be_positive_number"
    },
    {
      "field": "expectedSalary",
      "reason": "must_be_positive_number"
    }
  ]
}
```

## 2026-03-03T12:16:52.651Z | v1-69a6d130b82f377c9d838f22-1772540208971 | pipeline_error
```json
{
  "message": "Smart Interview extraction is incomplete. Please clearly mention role, city, experience, expected salary, and skills.",
  "statusCode": 422,
  "details": {
    "success": false,
    "error": "Smart Interview extraction is incomplete. Please clearly mention role, city, experience, expected salary, and skills.",
    "validationIssues": [
      {
        "field": "roleName",
        "reason": "missing_or_empty"
      },
      {
        "field": "city",
        "reason": "missing_or_empty"
      },
      {
        "field": "skills",
        "reason": "missing_or_empty"
      },
      {
        "field": "totalExperience",
        "reason": "must_be_positive_number"
      },
      {
        "field": "expectedSalary",
        "reason": "must_be_positive_number"
      }
    ],
    "extractedData": {
      "roleName": "",
      "city": "",
      "skills": [],
      "totalExperience": 0,
      "expectedSalary": 0
    }
  }
}
```

## 2026-03-03T13:01:38.864Z | v1-69a6dba621b919650a826844-1772542898861 | pipeline_start
```json
{
  "userId": "69a6dba621b919650a826844",
  "role": "worker",
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498
}
```

## 2026-03-03T13:01:38.867Z | v1-69a6dba621b919650a826844-1772542898861 | request_received
```json
{
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498,
  "userId": "69a6dba621b919650a826844"
}
```

## 2026-03-03T13:01:39.093Z | v1-69a6dba621b919650a826844-1772542898861 | pipeline_error
```json
{
  "message": "The specified bucket is not valid.",
  "statusCode": 500,
  "details": null
}
```

## 2026-03-03T13:04:12.640Z | forensic-1772543052639 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "/tmp/smart-audit.mp3",
  "audioBytes": 64388,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T13:04:12.644Z | forensic-1772543052639 | gemini_called
```json
{
  "stage": "transcription",
  "operation": "transcribe_interview_audio",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ]
}
```

## 2026-03-03T13:04:17.126Z | forensic-1772543052639 | transcript_received
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:04:17.126Z | forensic-1772543052639 | stt_transcription_return
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:04:17.126Z | forensic-1772543052639 | gemini_called
```json
{
  "stage": "extraction",
  "operation": "extract_worker_data_from_transcript",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T13:04:18.508Z | forensic-1772543052639 | gemini_response_received
```json
{
  "operation": "extract_worker_data_from_transcript",
  "rawGeminiResponse": "{\"firstName\": \"Rahul\", \"city\": \"Hyderabad\", \"totalExperience\": 3, \"roleName\": \"Delivery Rider\", \"expectedSalary\": 25000, \"skills\": [\"delivery\", \"bike riding\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:04:18.509Z | forensic-1772543052639 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"Rahul\", \"city\": \"Hyderabad\", \"totalExperience\": 3, \"roleName\": \"Delivery Rider\", \"expectedSalary\": 25000, \"skills\": [\"delivery\", \"bike riding\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:04:18.509Z | forensic-1772543052639 | json_parsed
```json
{
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:04:18.509Z | forensic-1772543052639 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:04:18.510Z | forensic-1772543052639 | validation_layer
```json
{
  "coverageScore": 6,
  "missingFields": [],
  "sanitizedExtraction": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:05:45.860Z | v1-69a6dc129f38b10af5d3fe80-1772543145860 | upload_route_received
```json
{
  "authPassed": true,
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/c7fdf18be2ea620caad92d7522e5e66c",
  "fileExists": true,
  "fileSizeBytes": 126498,
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "userId": "69a6dc129f38b10af5d3fe80",
  "interviewId": "v1-69a6dc129f38b10af5d3fe80-1772543145860"
}
```

## 2026-03-03T13:05:45.864Z | v1-69a6dc129f38b10af5d3fe80-1772543145860 | pipeline_start
```json
{
  "userId": "69a6dc129f38b10af5d3fe80",
  "role": "worker",
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498
}
```

## 2026-03-03T13:05:45.864Z | v1-69a6dc129f38b10af5d3fe80-1772543145860 | request_received
```json
{
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498,
  "userId": "69a6dc129f38b10af5d3fe80"
}
```

## 2026-03-03T13:05:45.865Z | v1-69a6dc129f38b10af5d3fe80-1772543145860 | video_storage_precheck
```json
{
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/c7fdf18be2ea620caad92d7522e5e66c",
  "fileExists": true,
  "fileSizeBytes": 126498
}
```

## 2026-03-03T13:05:45.866Z | v1-69a6dc129f38b10af5d3fe80-1772543145860 | pipeline_error
```json
{
  "message": "S3 bucket is not configured. Set AWS_BUCKET_NAME or AWS_S3_BUCKET.",
  "statusCode": 503,
  "code": "S3_CONFIG_INVALID",
  "details": null
}
```

## 2026-03-03T13:06:10.614Z | v1-69a6dba621b919650a826844-1772543170614 | upload_route_received
```json
{
  "authPassed": true,
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/2e536f613b9953242d47548b1ad9c866",
  "fileExists": true,
  "fileSizeBytes": 126498,
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "userId": "69a6dba621b919650a826844",
  "interviewId": "v1-69a6dba621b919650a826844-1772543170614"
}
```

## 2026-03-03T13:06:10.616Z | v1-69a6dba621b919650a826844-1772543170614 | pipeline_start
```json
{
  "userId": "69a6dba621b919650a826844",
  "role": "worker",
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498
}
```

## 2026-03-03T13:06:10.616Z | v1-69a6dba621b919650a826844-1772543170614 | request_received
```json
{
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498,
  "userId": "69a6dba621b919650a826844"
}
```

## 2026-03-03T13:06:10.616Z | v1-69a6dba621b919650a826844-1772543170614 | video_storage_precheck
```json
{
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/2e536f613b9953242d47548b1ad9c866",
  "fileExists": true,
  "fileSizeBytes": 126498
}
```

## 2026-03-03T13:06:10.616Z | v1-69a6dba621b919650a826844-1772543170614 | pipeline_error
```json
{
  "message": "S3 bucket is not configured. Set AWS_BUCKET_NAME or AWS_S3_BUCKET.",
  "statusCode": 503,
  "code": "S3_CONFIG_INVALID",
  "details": null
}
```

## 2026-03-03T13:22:20.710Z | v1-69a6e080db5f7d7343519082-1772544140709 | upload_route_received
```json
{
  "authPassed": true,
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/cf6fdc0e84bf0a24489cd37c4f27ce64",
  "fileExists": true,
  "fileSizeBytes": 126498,
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "userId": "69a6e080db5f7d7343519082",
  "interviewId": "v1-69a6e080db5f7d7343519082-1772544140709"
}
```

## 2026-03-03T13:22:20.712Z | v1-69a6e080db5f7d7343519082-1772544140709 | pipeline_start
```json
{
  "userId": "69a6e080db5f7d7343519082",
  "role": "worker",
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498
}
```

## 2026-03-03T13:22:20.712Z | v1-69a6e080db5f7d7343519082-1772544140709 | request_received
```json
{
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498,
  "userId": "69a6e080db5f7d7343519082"
}
```

## 2026-03-03T13:22:20.712Z | v1-69a6e080db5f7d7343519082-1772544140709 | video_storage_precheck
```json
{
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/cf6fdc0e84bf0a24489cd37c4f27ce64",
  "fileExists": true,
  "fileSizeBytes": 126498
}
```

## 2026-03-03T13:22:20.712Z | v1-69a6e080db5f7d7343519082-1772544140709 | video_stored_local
```json
{
  "localPath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/cf6fdc0e84bf0a24489cd37c4f27ce64"
}
```

## 2026-03-03T13:22:21.015Z | v1-69a6e080db5f7d7343519082-1772544140709 | audio_conversion
```json
{
  "audioPath": "uploads/cf6fdc0e84bf0a24489cd37c4f27ce64.mp3",
  "mimeType": "audio/mpeg",
  "sizeBytes": 48290
}
```

## 2026-03-03T13:22:21.017Z | v1-69a6e080db5f7d7343519082-1772544140709 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "uploads/cf6fdc0e84bf0a24489cd37c4f27ce64.mp3",
  "audioBytes": 64388,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T13:22:21.017Z | v1-69a6e080db5f7d7343519082-1772544140709 | gemini_called
```json
{
  "stage": "transcription",
  "operation": "transcribe_interview_audio",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ]
}
```

## 2026-03-03T13:22:23.389Z | v1-69a6e080db5f7d7343519082-1772544140709 | transcript_received
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:22:23.389Z | v1-69a6e080db5f7d7343519082-1772544140709 | stt_transcription_return
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:22:23.389Z | v1-69a6e080db5f7d7343519082-1772544140709 | gemini_called
```json
{
  "stage": "extraction",
  "operation": "extract_worker_data_from_transcript",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T13:22:24.772Z | v1-69a6e080db5f7d7343519082-1772544140709 | gemini_response_received
```json
{
  "operation": "extract_worker_data_from_transcript",
  "rawGeminiResponse": "{\"firstName\": \"Rahul\", \"city\": \"Hyderabad\", \"totalExperience\": 3, \"roleName\": \"Delivery Rider\", \"expectedSalary\": 25000, \"skills\": [\"delivery\", \"bike riding\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:22:24.772Z | v1-69a6e080db5f7d7343519082-1772544140709 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"Rahul\", \"city\": \"Hyderabad\", \"totalExperience\": 3, \"roleName\": \"Delivery Rider\", \"expectedSalary\": 25000, \"skills\": [\"delivery\", \"bike riding\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:22:24.772Z | v1-69a6e080db5f7d7343519082-1772544140709 | json_parsed
```json
{
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:22:24.772Z | v1-69a6e080db5f7d7343519082-1772544140709 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:22:24.773Z | v1-69a6e080db5f7d7343519082-1772544140709 | validation_layer
```json
{
  "coverageScore": 6,
  "missingFields": [],
  "sanitizedExtraction": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:22:24.773Z | v1-69a6e080db5f7d7343519082-1772544140709 | transcript_received
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172
}
```

## 2026-03-03T13:22:24.773Z | v1-69a6e080db5f7d7343519082-1772544140709 | gemini_structured_output
```json
{
  "rawTranscript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ],
    "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
    "manualFallbackRequired": false,
    "coverageScore": 6,
    "missingFields": []
  }
}
```

## 2026-03-03T13:22:24.773Z | v1-69a6e080db5f7d7343519082-1772544140709 | validation_layer
```json
{
  "normalizedExtraction": {
    "roleName": "Delivery Rider",
    "city": "Hyderabad",
    "skills": [
      "delivery",
      "bike riding"
    ],
    "totalExperience": 3,
    "expectedSalary": 25000
  },
  "validationIssues": []
}
```

## 2026-03-03T13:22:24.773Z | v1-69a6e080db5f7d7343519082-1772544140709 | validation_passed
```json
{
  "roleName": "Delivery Rider",
  "city": "Hyderabad",
  "skillsCount": 2,
  "totalExperience": 3,
  "expectedSalary": 25000
}
```

## 2026-03-03T13:22:24.840Z | v1-69a6e080db5f7d7343519082-1772544140709 | profile_builder
```json
{
  "role": "worker",
  "extractedData": {
    "name": "Rahul",
    "roleTitle": "Delivery Rider",
    "skills": [
      "delivery",
      "bike riding"
    ],
    "experienceYears": 3,
    "expectedSalary": "₹25,000",
    "preferredShift": "flexible",
    "location": "Hyderabad",
    "summary": ""
  }
}
```

## 2026-03-03T13:22:24.848Z | v1-69a6e080db5f7d7343519082-1772544140709 | db_write
```json
{
  "profileId": "69a6e090a053c8bdd27377eb",
  "jobId": "",
  "finalSavedProfileDocument": {
    "_id": "69a6e090a053c8bdd27377eb",
    "firstName": "Rahul",
    "city": "Hyderabad",
    "roleProfiles": [
      {
        "roleName": "Delivery Rider",
        "experienceInRole": 3,
        "expectedSalary": 25000,
        "skills": [
          "delivery",
          "bike riding"
        ],
        "lastUpdated": "2026-03-03T13:22:24.840Z",
        "_id": "69a6e0901acb97c4212f1706"
      }
    ]
  }
}
```

## 2026-03-03T13:22:24.849Z | v1-69a6e080db5f7d7343519082-1772544140709 | profile_saved
```json
{
  "profileId": "69a6e090a053c8bdd27377eb",
  "jobId": ""
}
```

## 2026-03-03T13:22:24.849Z | v1-69a6e080db5f7d7343519082-1772544140709 | response_sent
```json
{
  "success": true,
  "videoUrl": null,
  "extractedData": {
    "name": "Rahul",
    "roleTitle": "Delivery Rider",
    "skills": [
      "delivery",
      "bike riding"
    ],
    "experienceYears": 3,
    "expectedSalary": "₹25,000",
    "preferredShift": "flexible",
    "location": "Hyderabad",
    "summary": ""
  },
  "profile": {
    "videoIntroduction": {
      "videoUrl": null,
      "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
      "rawExtraction": {
        "firstName": "Rahul",
        "city": "Hyderabad",
        "totalExperience": 3,
        "roleName": "Delivery Rider",
        "expectedSalary": 25000,
        "skills": [
          "delivery",
          "bike riding"
        ],
        "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
        "manualFallbackRequired": false,
        "coverageScore": 6,
        "missingFields": []
      }
    },
    "settings": {
      "matchPreferences": {
        "maxCommuteDistanceKm": 25,
        "minimumMatchTier": "GOOD",
        "preferredShiftTimes": [],
        "roleClusters": [],
        "salaryExpectationMax": null,
        "salaryExpectationMin": null
      }
    },
    "interviewIntelligence": {
      "ambiguityRate": 0,
      "communicationClarityScore": 0,
      "communicationLabel": "Improving",
      "confidenceLanguageScore": 0,
      "lastInterviewAt": null,
      "profileQualityScore": 0,
      "profileStrengthLabel": "Weak",
      "salaryAlignmentStatus": "ALIGNED",
      "salaryMedianForRoleCity": null,
      "salaryOutlierFlag": false,
      "salaryRealismRatio": null,
      "slotCompletenessRatio": 0
    },
    "_id": "69a6e090a053c8bdd27377eb",
    "user": "69a6e080db5f7d7343519082",
    "__v": 0,
    "availabilityWindowDays": 0,
    "avatar": null,
    "city": "Hyderabad",
    "country": "IN",
    "createdAt": "2026-03-03T13:22:24.841Z",
    "firstName": "Rahul",
    "interviewVerified": false,
    "isAvailable": true,
    "language": null,
    "lastActiveAt": "2026-03-03T13:22:24.843Z",
    "lastName": "",
    "licenses": [],
    "openToNightShift": false,
    "openToRelocation": false,
    "preferredShift": "Flexible",
    "reliabilityScore": 0.75,
    "roleProfiles": [
      {
        "roleName": "Delivery Rider",
        "experienceInRole": 3,
        "expectedSalary": 25000,
        "skills": [
          "delivery",
          "bike riding"
        ],
        "lastUpdated": "2026-03-03T13:22:24.840Z",
        "_id": "69a6e0901acb97c4212f1706"
      }
    ],
    "totalExperience": 3,
    "updatedAt": "2026-03-03T13:22:24.841Z"
  },
  "job": null,
  "manualFallbackRequired": false,
  "validationIssues": []
}
```

## 2026-03-03T13:24:22.543Z | v1-69a6e080db5f7d7343519082-1772544262543 | upload_route_received
```json
{
  "authPassed": true,
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/6cbf8ac79118f6b821b9074412435aae",
  "fileExists": true,
  "fileSizeBytes": 126498,
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "userId": "69a6e080db5f7d7343519082",
  "interviewId": "v1-69a6e080db5f7d7343519082-1772544262543"
}
```

## 2026-03-03T13:24:22.549Z | v1-69a6e080db5f7d7343519082-1772544262543 | processing_job_created
```json
{
  "processingId": "69a6e10654716a15745bbf44",
  "status": "processing"
}
```

## 2026-03-03T13:24:22.549Z | v1-69a6e080db5f7d7343519082-1772544262543 | pipeline_start
```json
{
  "userId": "69a6e080db5f7d7343519082",
  "role": "worker",
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498
}
```

## 2026-03-03T13:24:22.550Z | v1-69a6e080db5f7d7343519082-1772544262543 | request_received
```json
{
  "originalName": "smart-audit.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 126498,
  "userId": "69a6e080db5f7d7343519082"
}
```

## 2026-03-03T13:24:22.550Z | v1-69a6e080db5f7d7343519082-1772544262543 | video_storage_precheck
```json
{
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/6cbf8ac79118f6b821b9074412435aae",
  "fileExists": true,
  "fileSizeBytes": 126498
}
```

## 2026-03-03T13:24:22.550Z | v1-69a6e080db5f7d7343519082-1772544262543 | video_stored_local
```json
{
  "localPath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/backend/uploads/6cbf8ac79118f6b821b9074412435aae"
}
```

## 2026-03-03T13:24:22.681Z | v1-69a6e080db5f7d7343519082-1772544262543 | audio_conversion
```json
{
  "audioPath": "uploads/6cbf8ac79118f6b821b9074412435aae.mp3",
  "mimeType": "audio/mpeg",
  "sizeBytes": 48290
}
```

## 2026-03-03T13:24:22.681Z | v1-69a6e080db5f7d7343519082-1772544262543 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "uploads/6cbf8ac79118f6b821b9074412435aae.mp3",
  "audioBytes": 64388,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T13:24:22.682Z | v1-69a6e080db5f7d7343519082-1772544262543 | gemini_called
```json
{
  "stage": "transcription",
  "operation": "transcribe_interview_audio",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ]
}
```

## 2026-03-03T13:24:25.014Z | v1-69a6e080db5f7d7343519082-1772544262543 | transcript_received
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:24:25.014Z | v1-69a6e080db5f7d7343519082-1772544262543 | stt_transcription_return
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:24:25.014Z | v1-69a6e080db5f7d7343519082-1772544262543 | gemini_called
```json
{
  "stage": "extraction",
  "operation": "extract_worker_data_from_transcript",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T13:24:26.236Z | v1-69a6e080db5f7d7343519082-1772544262543 | gemini_response_received
```json
{
  "operation": "extract_worker_data_from_transcript",
  "rawGeminiResponse": "{\"firstName\": \"Rahul\", \"city\": \"Hyderabad\", \"totalExperience\": 3, \"roleName\": \"Delivery Rider\", \"expectedSalary\": 25000, \"skills\": [\"delivery\", \"bike riding\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:24:26.237Z | v1-69a6e080db5f7d7343519082-1772544262543 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"Rahul\", \"city\": \"Hyderabad\", \"totalExperience\": 3, \"roleName\": \"Delivery Rider\", \"expectedSalary\": 25000, \"skills\": [\"delivery\", \"bike riding\"]}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T13:24:26.237Z | v1-69a6e080db5f7d7343519082-1772544262543 | json_parsed
```json
{
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:24:26.237Z | v1-69a6e080db5f7d7343519082-1772544262543 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:24:26.238Z | v1-69a6e080db5f7d7343519082-1772544262543 | validation_layer
```json
{
  "coverageScore": 6,
  "missingFields": [],
  "sanitizedExtraction": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ]
  }
}
```

## 2026-03-03T13:24:26.239Z | v1-69a6e080db5f7d7343519082-1772544262543 | transcript_received
```json
{
  "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "transcriptLength": 172
}
```

## 2026-03-03T13:24:26.239Z | v1-69a6e080db5f7d7343519082-1772544262543 | gemini_structured_output
```json
{
  "rawTranscript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
  "parsedStructuredObject": {
    "firstName": "Rahul",
    "city": "Hyderabad",
    "totalExperience": 3,
    "roleName": "Delivery Rider",
    "expectedSalary": 25000,
    "skills": [
      "delivery",
      "bike riding"
    ],
    "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
    "manualFallbackRequired": false,
    "coverageScore": 6,
    "missingFields": []
  }
}
```

## 2026-03-03T13:24:26.239Z | v1-69a6e080db5f7d7343519082-1772544262543 | validation_layer
```json
{
  "normalizedExtraction": {
    "roleName": "Delivery Rider",
    "city": "Hyderabad",
    "skills": [
      "delivery",
      "bike riding"
    ],
    "totalExperience": 3,
    "expectedSalary": 25000
  },
  "validationIssues": []
}
```

## 2026-03-03T13:24:26.240Z | v1-69a6e080db5f7d7343519082-1772544262543 | validation_passed
```json
{
  "roleName": "Delivery Rider",
  "city": "Hyderabad",
  "skillsCount": 2,
  "totalExperience": 3,
  "expectedSalary": 25000
}
```

## 2026-03-03T13:24:26.303Z | v1-69a6e080db5f7d7343519082-1772544262543 | profile_builder
```json
{
  "role": "worker",
  "extractedData": {
    "name": "Rahul",
    "roleTitle": "Delivery Rider",
    "skills": [
      "delivery",
      "bike riding"
    ],
    "experienceYears": 3,
    "expectedSalary": "₹25,000",
    "preferredShift": "flexible",
    "location": "Hyderabad",
    "summary": ""
  }
}
```

## 2026-03-03T13:24:26.313Z | v1-69a6e080db5f7d7343519082-1772544262543 | status_updated
```json
{
  "processingId": "69a6e10654716a15745bbf44",
  "status": "completed"
}
```

## 2026-03-03T13:24:26.313Z | v1-69a6e080db5f7d7343519082-1772544262543 | db_write
```json
{
  "profileId": "69a6e090a053c8bdd27377eb",
  "jobId": "",
  "finalSavedProfileDocument": {
    "_id": "69a6e090a053c8bdd27377eb",
    "firstName": "Rahul",
    "city": "Hyderabad",
    "roleProfiles": [
      {
        "roleName": "Delivery Rider",
        "experienceInRole": 3,
        "expectedSalary": 25000,
        "skills": [
          "delivery",
          "bike riding"
        ],
        "lastUpdated": "2026-03-03T13:24:26.304Z",
        "_id": "69a6e10a54716a15745bbf5f"
      }
    ]
  }
}
```

## 2026-03-03T13:24:26.313Z | v1-69a6e080db5f7d7343519082-1772544262543 | profile_saved
```json
{
  "profileId": "69a6e090a053c8bdd27377eb",
  "jobId": ""
}
```

## 2026-03-03T13:24:26.313Z | v1-69a6e080db5f7d7343519082-1772544262543 | response_sent
```json
{
  "success": true,
  "videoUrl": null,
  "processingId": "69a6e10654716a15745bbf44",
  "extractedData": {
    "name": "Rahul",
    "roleTitle": "Delivery Rider",
    "skills": [
      "delivery",
      "bike riding"
    ],
    "experienceYears": 3,
    "expectedSalary": "₹25,000",
    "preferredShift": "flexible",
    "location": "Hyderabad",
    "summary": ""
  },
  "profile": {
    "videoIntroduction": {
      "videoUrl": null,
      "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
      "rawExtraction": {
        "firstName": "Rahul",
        "city": "Hyderabad",
        "totalExperience": 3,
        "roleName": "Delivery Rider",
        "expectedSalary": 25000,
        "skills": [
          "delivery",
          "bike riding"
        ],
        "transcript": "Hi, my name is Rahul. I am a delivery rider in Hyderabad with three years of experience. My expected salary is 25,000 rupees per month. My skills are delivery, bike riding,",
        "manualFallbackRequired": false,
        "coverageScore": 6,
        "missingFields": []
      }
    },
    "settings": {
      "matchPreferences": {
        "maxCommuteDistanceKm": 25,
        "minimumMatchTier": "GOOD",
        "preferredShiftTimes": [],
        "roleClusters": [],
        "salaryExpectationMax": null,
        "salaryExpectationMin": null
      }
    },
    "interviewIntelligence": {
      "ambiguityRate": 0,
      "communicationClarityScore": 0,
      "communicationLabel": "Improving",
      "confidenceLanguageScore": 0,
      "lastInterviewAt": null,
      "profileQualityScore": 0,
      "profileStrengthLabel": "Weak",
      "salaryAlignmentStatus": "ALIGNED",
      "salaryMedianForRoleCity": null,
      "salaryOutlierFlag": false,
      "salaryRealismRatio": null,
      "slotCompletenessRatio": 0
    },
    "_id": "69a6e090a053c8bdd27377eb",
    "user": "69a6e080db5f7d7343519082",
    "__v": 0,
    "availabilityWindowDays": 0,
    "avatar": null,
    "city": "Hyderabad",
    "country": "IN",
    "createdAt": "2026-03-03T13:22:24.841Z",
    "firstName": "Rahul",
    "interviewVerified": false,
    "isAvailable": true,
    "language": null,
    "lastActiveAt": "2026-03-03T13:22:24.843Z",
    "lastName": "",
    "licenses": [],
    "openToNightShift": false,
    "openToRelocation": false,
    "preferredShift": "Flexible",
    "reliabilityScore": 0.75,
    "roleProfiles": [
      {
        "roleName": "Delivery Rider",
        "experienceInRole": 3,
        "expectedSalary": 25000,
        "skills": [
          "delivery",
          "bike riding"
        ],
        "lastUpdated": "2026-03-03T13:24:26.304Z",
        "_id": "69a6e10a54716a15745bbf5f"
      }
    ],
    "totalExperience": 3,
    "updatedAt": "2026-03-03T13:24:26.304Z"
  },
  "job": null,
  "manualFallbackRequired": false,
  "validationIssues": []
}
```

## 2026-03-03T15:09:59.659Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | upload_route_received
```json
{
  "authPassed": true,
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/HIRE-NEW-V1-main/backend/uploads/6182613d70459a009f11d2f99ebfd098",
  "fileExists": true,
  "fileSizeBytes": 25975917,
  "originalName": "smart-interview-1772550591568.mp4",
  "mimeType": "video/mp4",
  "userId": "69a6f3f90e6e6e823f7f1ece",
  "interviewId": "v1-69a6f3f90e6e6e823f7f1ece-1772550599659"
}
```

## 2026-03-03T15:09:59.664Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | processing_job_created
```json
{
  "processingId": "69a6f9c7886516a940472e78",
  "status": "processing"
}
```

## 2026-03-03T15:09:59.664Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | pipeline_start
```json
{
  "userId": "69a6f3f90e6e6e823f7f1ece",
  "role": "worker",
  "originalName": "smart-interview-1772550591568.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 25975917
}
```

## 2026-03-03T15:09:59.664Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | request_received
```json
{
  "originalName": "smart-interview-1772550591568.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 25975917,
  "userId": "69a6f3f90e6e6e823f7f1ece"
}
```

## 2026-03-03T15:09:59.665Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | video_storage_precheck
```json
{
  "filePath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/HIRE-NEW-V1-main/backend/uploads/6182613d70459a009f11d2f99ebfd098",
  "fileExists": true,
  "fileSizeBytes": 25975917
}
```

## 2026-03-03T15:09:59.665Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | video_stored_local
```json
{
  "localPath": "/Users/Path/Desktop/Lokesh/HIRE-NEW-V1/HIRE-NEW-V1-main/backend/uploads/6182613d70459a009f11d2f99ebfd098"
}
```

## 2026-03-03T15:09:59.910Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | audio_conversion
```json
{
  "audioPath": "uploads/6182613d70459a009f11d2f99ebfd098.mp3",
  "mimeType": "audio/mpeg",
  "sizeBytes": 163947
}
```

## 2026-03-03T15:09:59.911Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | pipeline_start
```json
{
  "role": "worker",
  "audioPath": "uploads/6182613d70459a009f11d2f99ebfd098.mp3",
  "audioBytes": 218596,
  "audioModelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ],
  "textModelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T15:09:59.911Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | gemini_called
```json
{
  "stage": "transcription",
  "operation": "transcribe_interview_audio",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite"
  ]
}
```

## 2026-03-03T15:10:03.257Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | transcript_received
```json
{
  "transcript": "Hi, my name is Lokesh. I am a software engineer.",
  "transcriptLength": 48,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T15:10:03.258Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | stt_transcription_return
```json
{
  "transcript": "Hi, my name is Lokesh. I am a software engineer.",
  "transcriptLength": 48,
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T15:10:03.258Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | gemini_called
```json
{
  "stage": "extraction",
  "operation": "extract_worker_data_from_transcript",
  "modelChain": [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ]
}
```

## 2026-03-03T15:10:04.723Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | gemini_response_received
```json
{
  "operation": "extract_worker_data_from_transcript",
  "rawGeminiResponse": "{\"firstName\": \"Lokesh\", \"city\": \"\", \"totalExperience\": 0, \"roleName\": \"Software Engineer\", \"expectedSalary\": 0, \"skills\": []}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T15:10:04.723Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | gemini_raw_response
```json
{
  "rawGeminiResponse": "{\"firstName\": \"Lokesh\", \"city\": \"\", \"totalExperience\": 0, \"roleName\": \"Software Engineer\", \"expectedSalary\": 0, \"skills\": []}",
  "model": "gemini-2.5-flash"
}
```

## 2026-03-03T15:10:04.723Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | json_parsed
```json
{
  "parsedStructuredObject": {
    "firstName": "Lokesh",
    "city": "",
    "totalExperience": 0,
    "roleName": "Software Engineer",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T15:10:04.723Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | json_parsing_layer
```json
{
  "parsedStructuredObject": {
    "firstName": "Lokesh",
    "city": "",
    "totalExperience": 0,
    "roleName": "Software Engineer",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T15:10:04.724Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | validation_layer
```json
{
  "coverageScore": 2,
  "missingFields": [
    "city",
    "totalExperience",
    "expectedSalary",
    "skills"
  ],
  "sanitizedExtraction": {
    "firstName": "Lokesh",
    "city": "",
    "totalExperience": 0,
    "roleName": "Software Engineer",
    "expectedSalary": 0,
    "skills": []
  }
}
```

## 2026-03-03T15:10:04.725Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | transcript_received
```json
{
  "transcript": "Hi, my name is Lokesh. I am a software engineer.",
  "transcriptLength": 48
}
```

## 2026-03-03T15:10:04.725Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | gemini_structured_output
```json
{
  "rawTranscript": "Hi, my name is Lokesh. I am a software engineer.",
  "parsedStructuredObject": {
    "firstName": "Lokesh",
    "city": "",
    "totalExperience": 0,
    "roleName": "Software Engineer",
    "expectedSalary": 0,
    "skills": [],
    "transcript": "Hi, my name is Lokesh. I am a software engineer.",
    "manualFallbackRequired": true,
    "coverageScore": 2,
    "missingFields": [
      "city",
      "totalExperience",
      "expectedSalary",
      "skills"
    ]
  }
}
```

## 2026-03-03T15:10:04.725Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | validation_layer
```json
{
  "normalizedExtraction": {
    "roleName": "Software Engineer",
    "city": "",
    "skills": [],
    "totalExperience": 0,
    "expectedSalary": 0
  },
  "validationIssues": [
    {
      "field": "city",
      "reason": "missing_or_empty"
    },
    {
      "field": "skills",
      "reason": "missing_or_empty"
    },
    {
      "field": "totalExperience",
      "reason": "must_be_positive_number"
    },
    {
      "field": "expectedSalary",
      "reason": "must_be_positive_number"
    }
  ]
}
```

## 2026-03-03T15:10:04.730Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | status_updated
```json
{
  "processingId": "69a6f9c7886516a940472e78",
  "status": "failed"
}
```

## 2026-03-03T15:10:04.731Z | v1-69a6f3f90e6e6e823f7f1ece-1772550599659 | pipeline_error
```json
{
  "message": "Smart Interview extraction is incomplete. Please clearly mention role, city, experience, expected salary, and skills.",
  "statusCode": 422,
  "code": "",
  "details": {
    "success": false,
    "error": "Smart Interview extraction is incomplete. Please clearly mention role, city, experience, expected salary, and skills.",
    "validationIssues": [
      {
        "field": "city",
        "reason": "missing_or_empty"
      },
      {
        "field": "skills",
        "reason": "missing_or_empty"
      },
      {
        "field": "totalExperience",
        "reason": "must_be_positive_number"
      },
      {
        "field": "expectedSalary",
        "reason": "must_be_positive_number"
      }
    ],
    "extractedData": {
      "roleName": "Software Engineer",
      "city": "",
      "skills": [],
      "totalExperience": 0,
      "expectedSalary": 0
    }
  }
}
```
