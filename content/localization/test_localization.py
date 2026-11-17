import copy,json,tempfile,unittest
from pathlib import Path
from build_english import localize
from verify_english import audit,signature

class LocalizationGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        for folder in ['content/localization','content/en']:(self.root/folder).mkdir(parents=True,exist_ok=True)
        self.source={'sets':[{'id':'time','title':'钟表','problems':[{'id':'clock','type':'mc','prompt':'时针指向3，分针指向12。现在是几时？','hint':'分针指向12是整时','explanation':'3时','choices':[{'id':'a','label':'3时','correct':True},{'id':'b','label':'12时','correct':False}]},{'id':'sum','type':'fill','prompt':'1 + 2','answer':3}]}]}
        self.memory={'钟表':'Telling time','时针指向3，分针指向12。现在是几时？':'The hour hand points to 3 and the minute hand points to 12. What time is it?','分针指向12是整时':'The minute hand at 12 means an exact hour.','3时':"3 o'clock",'12时':"12 o'clock"}
        self.target=localize(self.source,self.memory)
    def tearDown(self):self.tmp.cleanup()
    def run_audit(self):
        for p,d in [('content/grade3_practice_pack.json',self.source),('content/en/grade3_practice_pack.json',self.target),('content/localization/en.json',self.memory)]:
            (self.root/p).write_text(json.dumps(d,ensure_ascii=False))
        return audit(self.root)
    def test_complete_translation_passes(self):
        result=self.run_audit();self.assertFalse(result['errors']);self.assertFalse(result['math_flags'])
        self.assertEqual(result['problem_count'],2);self.assertEqual(result['choice_count'],2)
    def test_missing_translation_is_fatal(self):
        del self.memory['钟表']
        with self.assertRaises(ValueError):localize(self.source,self.memory)
    def test_question_deletion_fails(self):
        self.target['sets'][0]['problems'].pop();self.assertTrue(self.run_audit()['errors'])
    def test_numeric_answer_change_fails(self):
        self.target['sets'][0]['problems'][1]['answer']=4
        self.assertTrue(any(e['kind']=='changed_invariant' for e in self.run_audit()['errors']))
    def test_choice_correctness_change_fails(self):
        self.target['sets'][0]['problems'][0]['choices'][1]['correct']=True
        self.assertTrue(self.run_audit()['errors'])
    def test_choice_quantity_change_flags_even_if_memory_agrees(self):
        self.memory['3时']="4 o'clock";self.target=localize(self.source,self.memory)
        self.assertTrue(self.run_audit()['math_flags'])
    def test_operator_change_flags(self):
        self.source['sets'][0]['problems'][1]['hint']='计算1+2'
        self.memory['计算1+2']='Calculate 1×2';self.target=localize(self.source,self.memory)
        self.assertTrue(self.run_audit()['math_flags'])
    def test_pure_math_is_preserved(self):
        source={'prompt':'  34\n+ 25\n────','answer':59,'choices':[{'label':'−3/4'}]}
        self.assertEqual(localize(source,{}),source)
    def test_cjk_translation_rejected(self):
        self.memory['钟表']='Clock 钟表'
        with self.assertRaises(ValueError):localize(self.source,self.memory)
    def test_worded_expected_answer_requires_editorial_pin(self):
        self.source['sets'][0]['problems'][1]['answer']='1 分 30 秒'
        self.memory['1 分 30 秒']='1 min 30 s';self.target=localize(self.source,self.memory)
        self.assertTrue(any(e['kind']=='unreviewed_word_answer' for e in self.run_audit()['errors']))
        (self.root/'content/localization/word_answers.json').write_text(json.dumps({'1 分 30 秒':'1 min 30 s'}))
        self.assertFalse(self.run_audit()['errors'])
    def test_unit_dimension_equivalence(self):
        self.assertEqual(signature('5 平方厘米'),signature('5 cm²'))
        self.assertNotEqual(signature('5 平方厘米'),signature('5 cm'))
        self.assertNotEqual(signature('5 厘米'),signature('5 m'))
        self.assertEqual(signature('7.2 米'),signature('7.2-meter'))
    def test_negative_sign_change_detected(self):
        self.assertNotEqual(signature('−5 + 2'),signature('5 + 2'))
        self.assertEqual(signature('3 位数'),signature('3-digit number'))
    def test_month_name_equivalence(self):
        self.assertEqual(signature('3 月 1 日'),signature('March 1'))
        self.assertNotEqual(signature('3 月 1 日'),signature('May 1'))
        self.assertEqual(signature('可能不同'),signature('May be different'))
    def test_empty_array_changed_to_object_fails(self):
        self.source['dependsOn']=[];self.target['dependsOn']={}
        self.assertTrue(self.run_audit()['errors'])
    def test_boolean_replaced_by_integer_fails(self):
        self.target['sets'][0]['problems'][0]['choices'][0]['correct']=1
        self.assertTrue(self.run_audit()['errors'])
    def test_wrong_mathematical_term_fails(self):
        self.source['sets'][0]['problems'][0]['hint']='求补角'
        self.memory['求补角']='Find the complementary angle';self.target=localize(self.source,self.memory)
        (self.root/'content/localization/glossary.json').write_text(json.dumps({'补角':'supplement'}))
        self.assertTrue(self.run_audit()['term_flags'])
    def test_fraction_and_power_operators_cannot_disappear(self):
        self.assertNotEqual(signature('1/5'),signature('1 5'))
        self.assertNotEqual(signature('x/y'),signature('x y'))
        self.assertNotEqual(signature('x^3'),signature('x 3'))
        self.assertNotEqual(signature('2±1'),signature('2 1'))
    def test_numeric_precision_detected(self):self.assertNotEqual(signature('0.50'),signature('0.5'))

if __name__=='__main__':unittest.main()
