import os
import json
import uuid
import boto3
import logging

# Configuração do logger para que os logs apareçam no CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializa o client do Step Functions usando o Boto3 (SDK da AWS para Python)
sfn = boto3.client('stepfunctions')

# Função para montar os headers de CORS (Cross-Origin Resource Sharing)
def get_cors_headers():
    """
    Retorna os cabeçalhos CORS para permitir que requisições de origens diferentes acessem a Lambda.
    A origem permitida pode ser configurada por variável de ambiente (CORS_ORIGIN).
    """

    origin = os.environ.get('CORS_ORIGIN') 
    return {
        "Access-Control-Allow-Origin": origin,             # Origem permitida (configurável por variável de ambiente)
        "Access-Control-Allow-Headers": "Content-Type",    # Cabeçalhos permitidos
        "Access-Control-Allow-Methods": "OPTIONS,POST",    # Métodos permitidos
        "Content-Type": "application/json"                 # Tipo de conteúdo da resposta
    }

# Função principal da Lambda
def lambda_handler(event, _context):
    """
    Esta função é acionada por um API Gateway.
    Se a requisição for do tipo OPTIONS, responde com os cabeçalhos CORS.
    Caso contrário, inicia uma execução da Step Function para processar um novo pedido,
    enviando os dados recebidos no corpo da requisição.
    """

    # Loga o evento recebido para visualização no CloudWatch
    logger.info(f"Evento Recebido: {event}")

    # Trata requisições do tipo OPTIONS (usado em pré-verificação do CORS)
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": get_cors_headers(),
            "body": ""
        }

    # Tenta extrair os dados da requisição
    try:
        # Se o corpo da requisição for uma string JSON, faz o parse
        if "body" in event and isinstance(event["body"], str):
            body = json.loads(event["body"])
        else:
            body = event # Em alguns testes locais, os dados podem vir direto no evento

        # Extrai os campos esperados
        produtos = body["produtos"]
        total = body["total"]
    except (KeyError, TypeError, json.JSONDecodeError) as e:
        # Caso falte algum campo ou o JSON esteja mal formado
        logger.warning(f"Erro nos dados recebidos: {str(e)}")
        return {
            "statusCode": 400,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": f"Erro nos dados recebidos: {str(e)}"})
        }

    # Gera um ID único e aleatório para identificar o pedido
    pedido_id = str(uuid.uuid4())

    # Monta os dados que serão enviados para a Step Function
    input_data = {
        "pedidoId": pedido_id,
        "produtos": produtos,
        "total": total
    }

    # Tenta iniciar a execução da Step Function com os dados recebidos
    try:
        sfn.start_execution(
            stateMachineArn=os.environ['STATE_MACHINE_ARN'], # ARN da Step Function vindo por variável de ambiente
            input=json.dumps(input_data) # Converte os dados para JSON
        )
    except Exception as e:
        # Em caso de erro na chamada para o Step Functions
        logger.error(f"Erro ao iniciar Step Function: {str(e)}")
        return {
            "statusCode": 500,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": "Erro ao iniciar o pedido"})
        }

    # Loga sucesso da operação e retorna resposta ao cliente
    logger.info(f"Pedido iniciado com ID: {pedido_id}")
    return {
        "statusCode": 200,
        "headers": get_cors_headers(),
        "body": json.dumps({
            "message": "Pedido iniciado",
            "pedidoId": pedido_id
        })
    }
