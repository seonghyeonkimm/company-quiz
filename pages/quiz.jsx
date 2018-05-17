import _ from 'lodash';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Router from 'next/router';

import {
  QuizImg,
  Center,
  Title,
  Form,
} from 'Components/StyleComponents';
import { Button } from 'Components/Buttons';
import { InputGroup, Alert } from 'Components/Inputs';
import { DATABASE } from 'Constants';

const ERRORS = ['팀원에 대한 관심이 더 필요할 것 같아요! 다시 선택해주세요!', '아, 안타깝지만 정답이 아닙니다.'];
const Question = ({
  data, current, onClick,
}) => (
  <Center>
    <QuizImg src={data.answer.img} alt={data.answer.img} />
    {
      data.options.map((option, idx) => (
        // eslint-disable-next-line
        <InputGroup key={idx}>
          <InputGroup.Radio
            name="answer"
            value={`${option.department}/${option.name}`}
            onClick={onClick}
            current={current}
          >
            { option.department } / { option.name }
          </InputGroup.Radio>
        </InputGroup>

      ))
    }
  </Center>
);

Question.propTypes = {
  data: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  current: PropTypes.string.isRequired,
};

class Quiz extends Component {
  state = {
    stage: 1,
    answer: '',
    errorMsg: '',
    loading: false,
  }

  static async getInitialProps(ctx) {
    const { query, res, req } = ctx;
    const { name, department, position } = query;
    const isValid = name && department && position;
    if (!isValid) {
      // server redirect
      if (res) {
        res.writeHead(302, {
          Location: '/',
        });
        res.end();
        res.finished = true;
      } else {
        // client redirect
        Router.push('/');
      }
    }

    const baseUrl = req ? `${req.protocol}://${req.get('Host')}` : '';
    const { question_counts, options_count } = await fetch(`${baseUrl}/api/settings`)
      .then(response => response.json());

    // exclude one who apply for the survey
    const { members } = DATABASE;
    const colleagues = members.filter(
      member => (
        member.name !== name ||
        member.department !== department ||
        member.position !== position
      ),
    );

    const quizSource = _.shuffle(colleagues).slice(0, question_counts * options_count);
    const data = Array.from({ length: question_counts }, (v, i) => (
      {
        answer: quizSource[options_count * i],
        options: _.shuffle(
          quizSource.slice(
            options_count * i, options_count * (i + 1),
          ),
        ),
      }
    ));

    return { data };
  }

  _onClick = (e) => {
    e.preventDefault();
    const { name, value } = e.currentTarget;
    this.setState({
      [name]: value,
    });
  }

  _onSubmit = (e) => {
    e.preventDefault();
    const { stage, answer } = this.state;
    const data = this.props.data[stage - 1];
    const quizAnswer = `${data.answer.department}/${data.answer.name}`;
    if (answer !== quizAnswer) {
      this.setState({
        errorMsg: ERRORS[Math.floor(Math.random() * ERRORS.length)],
      });
      return;
    }

    if (stage === this.props.data.length) {
      Router.push('/result');
      this.setState({
        errorMsg: '',
      });
      return;
    }

    this.setState({
      loading: true,
    });

    setTimeout(() => {
      this.setState(prev => ({
        errorMsg: '',
        answer: '',
        stage: prev.stage + 1,
        loading: false,
      }));
    }, 1000);
  }

  render() {
    const { data } = this.props;
    const {
      stage, answer, errorMsg, loading,
    } = this.state;
    return (
      <Form onSubmit={this._onSubmit}>
        <Title>Quiz #{stage}</Title>
        <Question
          data={data[stage - 1]}
          onClick={this._onClick}
          current={answer}
        />
        {
          errorMsg ?
            <Alert>{ errorMsg }</Alert> : null
        }
        <Button
          submit
          fluid
          color={loading ? 'btn-success' : 'btn-primary'}
          loading={loading}
          loadingText={
            stage !== 3
              ? '오! 정답입니다. 다음문제로 갑니다.'
              : '정답입니다! 마지막 페이지로 이동합니다.'
          }
        >
          제출하기
        </Button>
      </Form>
    );
  }
}

Quiz.propTypes = {
  data: PropTypes.array.isRequired,
};

export default Quiz;
