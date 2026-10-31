from django.test import SimpleTestCase

from apps.speech.openai_speech import stt_timeout


class SttTimeoutTests(SimpleTestCase):
    def test_short_clips_keep_the_quick_limit(self):
        self.assertEqual(stt_timeout(20_000), 8)  # a few seconds of speech

    def test_long_clips_wait_longer_but_not_forever(self):
        self.assertGreater(stt_timeout(384_000), 25)  # about 40 s of speech
        self.assertEqual(stt_timeout(50_000_000), 40)
